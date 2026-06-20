<?php

namespace App\Console\Commands\Estoque;

use App\Models\Estoque\Categoria;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Sanitiza categorias duplicadas do catálogo de estoque.
 *
 * Contexto: o catálogo foi reimportado e gerou DUAS árvores idênticas. A
 * primeira (ids baixos) ficou órfã (0 produtos); a segunda (ids altos) carrega
 * todos os produtos. Este comando detecta os pares duplicados na RAIZ por nome
 * e SOFT-DELETA a subárvore que NÃO tem produtos (a órfã).
 *
 * Segurança:
 *   - Dry-run por padrão. Só executa com --execute.
 *   - Soft delete (reversível via restore).
 *   - NUNCA deleta uma subárvore que contenha produtos: se ambas as cópias
 *     tiverem produtos, o grupo é PULADO e reportado para revisão manual.
 *
 * Uso:
 *   php artisan estoque:dedup-categorias            (dry-run)
 *   php artisan estoque:dedup-categorias --execute  (aplica)
 */
class DedupCategorias extends Command
{
    protected $signature = 'estoque:dedup-categorias {--execute : Aplica de fato (soft delete). Sem isso, só simula.}';
    protected $description = 'Remove árvores de categorias duplicadas (mantém a que tem produtos).';

    public function handle(): int
    {
        $execute = (bool) $this->option('execute');

        // Carrega todas as categorias vivas
        $todas = DB::table('estoque_categorias')->whereNull('deleted_at')->get(['id', 'parent_id', 'nome']);

        // Mapa de filhos
        $filhosDe = [];
        foreach ($todas as $c) {
            $filhosDe[$c->parent_id ?? 0][] = $c->id;
        }

        // Subárvore (ids) recursiva
        $subtree = function ($id) use (&$subtree, $filhosDe) {
            $ids = [$id];
            foreach ($filhosDe[$id] ?? [] as $f) {
                $ids = array_merge($ids, $subtree($f));
            }
            return $ids;
        };

        // Conta produtos numa lista de categorias
        $contaProdutos = fn (array $ids) => DB::table('estoque_produtos')
            ->whereIn('categoria_id', $ids)
            ->whereNull('deleted_at')
            ->count();

        // Agrupa raízes (parent_id null) por nome
        $raizes = collect($todas)->whereNull('parent_id')->groupBy('nome');

        $aDeletar    = [];   // ids a soft-deletar
        $pulados     = [];   // grupos onde ambas têm produtos
        $resumo      = [];

        foreach ($raizes as $nome => $grupo) {
            if ($grupo->count() < 2) {
                continue; // sem duplicata
            }

            // Para cada cópia: subárvore + nº de produtos
            $copias = $grupo->map(function ($cat) use ($subtree, $contaProdutos) {
                $ids = $subtree($cat->id);
                return [
                    'id'       => $cat->id,
                    'ids'      => $ids,
                    'cats'     => count($ids),
                    'produtos' => $contaProdutos($ids),
                ];
            })->sortByDesc('produtos')->values();

            // Sobrevivente = mais produtos (tiebreak: menor id já que sortByDesc é estável o suficiente,
            // mas garantimos abaixo). Demais = perdedores.
            $sobrevivente = $copias->first();
            $perdedores   = $copias->slice(1);

            // Segurança: só deleta perdedor com 0 produtos.
            foreach ($perdedores as $p) {
                if ($p['produtos'] > 0) {
                    $pulados[] = "[{$nome}] cópia id{$p['id']} tem {$p['produtos']} produto(s) — PULADO (revisar manualmente)";
                    continue;
                }
                $aDeletar = array_merge($aDeletar, $p['ids']);
                $resumo[] = sprintf(
                    'Manter id%d (%d cats, %d prod) · remover id%d (%d cats, 0 prod)',
                    $sobrevivente['id'], $sobrevivente['cats'], $sobrevivente['produtos'],
                    $p['id'], $p['cats']
                );
            }
        }

        $aDeletar = array_values(array_unique($aDeletar));

        // ===== Relatório =====
        $this->info(str_repeat('=', 64));
        $this->info($execute ? 'DEDUP DE CATEGORIAS — EXECUÇÃO' : 'DEDUP DE CATEGORIAS — DRY-RUN (simulação)');
        $this->info(str_repeat('=', 64));
        foreach ($resumo as $linha) {
            $this->line('  ' . $linha);
        }
        if (!empty($pulados)) {
            $this->warn("\nGrupos pulados (ambas com produtos):");
            foreach ($pulados as $p) $this->warn('  ' . $p);
        }
        $this->info(sprintf(
            "\nCategorias a remover (soft delete): %d  |  grupos tratados: %d  |  pulados: %d",
            count($aDeletar), count($resumo), count($pulados)
        ));

        if (empty($aDeletar)) {
            $this->info('Nada a fazer.');
            return self::SUCCESS;
        }

        if (!$execute) {
            $this->comment("\nDry-run: nada foi alterado. Rode com --execute para aplicar.");
            return self::SUCCESS;
        }

        // ===== Execução (soft delete em lote) =====
        $agora = now();
        $afetadas = 0;
        foreach (array_chunk($aDeletar, 500) as $chunk) {
            $afetadas += DB::table('estoque_categorias')
                ->whereIn('id', $chunk)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $agora, 'updated_at' => $agora]);
        }

        $this->info("\n✓ {$afetadas} categorias soft-deletadas. (Reversível via restore.)");
        return self::SUCCESS;
    }
}
