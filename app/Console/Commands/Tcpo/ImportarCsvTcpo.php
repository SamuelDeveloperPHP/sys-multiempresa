<?php

namespace App\Console\Commands\Tcpo;

use App\Models\Tcpo\TcpoCategoria;
use App\Models\Tcpo\TcpoComposicao;
use App\Models\Tcpo\TcpoComposicaoItem;
use App\Models\Tcpo\TcpoImportacao;
use App\Models\Tcpo\TcpoInsumo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Importa um CSV denormalizado do TCPOweb para o catálogo global tcpo_*.
 *
 * Formato (separador ';', decimal ',', BOM):
 *   nivel1;nivel2;nivel3;nivel4;nivel5;categoria_folha;servico_base;
 *   servico_codigo;servico_descricao;servico_unidade;servico_tipo;
 *   insumo_codigo;insumo_descricao;insumo_un;insumo_class;
 *   insumo_coef;insumo_preco_unit;insumo_total;insumo_consumo
 *
 * Uma linha por item (serviço × insumo). A árvore de categorias é derivada do
 * caminho nivel1..nivel5 + categoria_folha. Idempotente:
 *   - categorias  por (base, legacy_path = caminho completo)
 *   - insumos     por (base, codigo)
 *   - serviços    por (base, codigo)  → tcpo_composicoes
 *   - itens       substituídos por serviço (na 1ª vez que aparece)
 *
 * Uso:
 *   php artisan tcpo:importar-csv docs/excel/tcpoweb_COMPLETO_COMPLETO_14867rows_754services_2026-06-20.csv --reset
 */
class ImportarCsvTcpo extends Command
{
    protected $signature = 'tcpo:importar-csv
                            {arquivo       : Caminho do CSV (absoluto ou relativo à raiz)}
                            {--base=TCPO   : Rótulo da base no catálogo}
                            {--reset       : APAGA os dados TCPO desta base antes de importar}
                            {--limite=     : Limita N linhas (teste)}';

    protected string $base = 'TCPO';
    protected array $catCache = [];      // caminho => id
    protected array $insumoCache = [];   // codigo => id
    protected array $compCache = [];     // codigo => id
    protected array $limpos = [];        // compId => itens já apagados
    protected array $totais = [];        // compId => ['sem','mod','mat','eqp']
    protected array $ordem = [];         // compId => próximo ordem
    protected array $buffer = [];        // itens p/ insert em lote

    public function handle(): int
    {
        $this->base = (string) $this->option('base') ?: 'TCPO';
        $limite = $this->option('limite') ? (int) $this->option('limite') : null;

        $caminho = $this->resolverCaminho((string) $this->argument('arquivo'));
        if (!$caminho) {
            $this->error('Arquivo não encontrado: ' . $this->argument('arquivo'));
            return self::FAILURE;
        }

        $this->info('=== Importação CSV TCPO → catálogo ===');
        $this->line('Arquivo: <info>' . $caminho . '</info>');
        $this->line('Base:    <info>' . $this->base . '</info>');

        if ($this->option('reset')) {
            if ($this->input->isInteractive() && !$this->confirm("--reset apaga TODOS os dados TCPO da base '{$this->base}'. Continuar?", false)) {
                return self::FAILURE;
            }
            $this->warn('Zerando base TCPO…');
            TcpoComposicao::where('base', $this->base)->forceDelete();
            TcpoInsumo::where('base', $this->base)->forceDelete();
            TcpoCategoria::where('base', $this->base)->forceDelete();
        } else {
            // pré-carrega caches p/ idempotência
            foreach (TcpoCategoria::where('base', $this->base)->whereNotNull('legacy_path')->get(['id', 'legacy_path']) as $c) {
                $this->catCache[$c->legacy_path] = $c->id;
            }
            foreach (TcpoInsumo::where('base', $this->base)->get(['id', 'codigo']) as $i) {
                $this->insumoCache[$i->codigo] = $i->id;
            }
            foreach (TcpoComposicao::where('base', $this->base)->get(['id', 'codigo']) as $c) {
                $this->compCache[$c->codigo] = $c->id;
            }
        }

        $fh = fopen($caminho, 'r');
        if (!$fh) {
            $this->error('Não consegui abrir o arquivo.');
            return self::FAILURE;
        }

        // Header (com BOM no 1º campo)
        $header = fgetcsv($fh, 0, ';');
        if ($header) {
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
        }
        $col = array_flip($header);
        $req = ['servico_codigo', 'insumo_codigo', 'categoria_folha'];
        foreach ($req as $r) {
            if (!isset($col[$r])) {
                $this->error("CSV sem a coluna obrigatória '{$r}'. Cabeçalho: " . implode(';', $header));
                fclose($fh);
                return self::FAILURE;
            }
        }

        $imp = TcpoImportacao::create([
            'base' => $this->base, 'escopo' => 'CSV: ' . basename($caminho),
            'status' => TcpoImportacao::STATUS_RUNNING, 'started_at' => now(),
        ]);

        $linhas = 0; $itens = 0; $puladas = 0;
        $bar = $this->output->createProgressBar(0);
        $bar->setFormat(' %current% linhas — %message%');
        $bar->setMessage('iniciando…');
        $bar->start();

        try {
            DB::beginTransaction();
            while (($row = fgetcsv($fh, 0, ';')) !== false) {
                if ($limite !== null && $linhas >= $limite) break;
                $linhas++;
                $g = fn ($k) => isset($col[$k], $row[$col[$k]]) ? trim((string) $row[$col[$k]]) : null;

                $servCod = $g('servico_codigo');
                if (!$servCod) { $puladas++; continue; }

                $catId = $this->resolverCategoria($row, $col, $g);
                $compId = $this->resolverServico($servCod, $g, $catId);

                $insCod = $g('insumo_codigo');
                if ($insCod) {
                    $insId = $this->resolverInsumo($insCod, $g);
                    $this->adicionarItem($compId, $insId, $insCod, $g);
                    $itens++;
                }

                if ($linhas % 500 === 0) {
                    $this->flush();
                    $bar->setMessage("{$itens} itens, " . count($this->compCache) . ' serviços');
                    $bar->advance(500);
                }
            }
            $this->flush();
            $bar->advance($linhas % 500);

            // Totais das composições
            foreach ($this->totais as $compId => $t) {
                TcpoComposicao::where('id', $compId)->update([
                    'total_sem_taxas' => round($t['sem'] ?? 0, 4),
                    'total_mod'       => round($t['mod'] ?? 0, 4),
                    'total_mat'       => round($t['mat'] ?? 0, 4),
                    'total_eqp'       => round($t['eqp'] ?? 0, 4),
                ]);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($fh);
            $imp->update(['status' => TcpoImportacao::STATUS_FAILED, 'finished_at' => now(), 'erro_global' => $e->getMessage()]);
            $this->newLine();
            $this->error('Falha: ' . $e->getMessage());
            return self::FAILURE;
        }
        fclose($fh);
        $bar->finish();
        $this->newLine();

        $imp->update([
            'status' => TcpoImportacao::STATUS_SUCCESS, 'finished_at' => now(),
            'total_categorias' => count($this->catCache), 'total_insumos' => count($this->insumoCache),
            'total_composicoes_importadas' => count($this->compCache), 'total_itens' => $itens,
        ]);

        $this->info('=== Concluído ===');
        $this->line(sprintf('  %d linhas, %d categorias, %d insumos, %d serviços, %d itens%s',
            $linhas, count($this->catCache), count($this->insumoCache), count($this->compCache), $itens,
            $puladas ? " (puladas: {$puladas})" : ''));
        return self::SUCCESS;
    }

    /** Resolve (cria) a categoria-folha a partir do caminho nivel1..5 + folha. */
    protected function resolverCategoria(array $row, array $col, callable $g): ?int
    {
        $partes = [];
        foreach (['nivel1', 'nivel2', 'nivel3', 'nivel4', 'nivel5', 'categoria_folha'] as $c) {
            $v = $g($c);
            if ($v !== null && $v !== '') {
                $partes[] = $v;
            }
        }
        if (!$partes) {
            return null;
        }

        $parentId = null;
        $acumulado = [];
        foreach ($partes as $i => $nome) {
            $acumulado[] = $nome;
            $path = implode('>', $acumulado);
            if (isset($this->catCache[$path])) {
                $parentId = $this->catCache[$path];
                continue;
            }
            $codigo = preg_match('/^(\d+)\./', $nome, $m) ? $m[1] : null;
            $cat = TcpoCategoria::firstOrNew(['base' => $this->base, 'legacy_path' => $path]);
            $cat->parent_id = $parentId;
            $cat->nome      = $nome;
            $cat->codigo    = $codigo;
            $cat->nivel     = $i;
            $cat->save();
            $this->catCache[$path] = $cat->id;
            $parentId = $cat->id;
        }
        return $parentId; // id da folha
    }

    protected function resolverServico(string $codigo, callable $g, ?int $catId): int
    {
        if (isset($this->compCache[$codigo])) {
            $id = $this->compCache[$codigo];
        } else {
            $c = TcpoComposicao::firstOrNew(['base' => $this->base, 'codigo' => $codigo]);
            $c->codigo_alt   = $codigo;
            $c->categoria_id = $catId;
            $c->tipo         = $g('servico_tipo');
            $c->unidade      = $g('servico_unidade');
            $c->descricao    = $g('servico_descricao') ?? $codigo;
            $c->ativo        = true;
            $c->save();
            $id = $c->id;
            $this->compCache[$codigo] = $id;
        }
        // Limpa itens pré-existentes na 1ª vez que o serviço aparece (re-import).
        if (!isset($this->limpos[$id])) {
            TcpoComposicaoItem::where('composicao_id', $id)->delete();
            $this->limpos[$id] = true;
        }
        return $id;
    }

    protected function resolverInsumo(string $codigo, callable $g): int
    {
        if (isset($this->insumoCache[$codigo])) {
            return $this->insumoCache[$codigo];
        }
        $i = TcpoInsumo::firstOrNew(['base' => $this->base, 'codigo' => $codigo]);
        $i->descricao = $g('insumo_descricao') ?? $codigo;
        $i->unidade   = $g('insumo_un');
        $i->classe    = ($cl = $g('insumo_class')) ? strtoupper($cl) : null;
        $i->ativo     = true;
        $i->save();
        return $this->insumoCache[$codigo] = $i->id;
    }

    protected function adicionarItem(int $compId, int $insId, string $insCod, callable $g): void
    {
        $coef  = $this->num($g('insumo_coef'));
        $total = $this->num($g('insumo_total'));
        $preco = $this->num($g('insumo_preco_unit'));
        if ($preco === null && $coef && $total !== null) {
            $preco = round($total / $coef, 4);
        }
        $classe = ($cl = $g('insumo_class')) ? strtoupper($cl) : null;
        $now = now();

        $this->buffer[] = [
            'composicao_id'  => $compId,
            'insumo_id'      => $insId,
            'codigo'         => $insCod,
            'descricao'      => $g('insumo_descricao'),
            'unidade'        => $g('insumo_un'),
            'classe'         => $classe,
            'coeficiente'    => $coef ?? 0,
            'consumo'        => $this->num($g('insumo_consumo')),
            'preco_unitario' => $preco,
            'total'          => $total,
            'ordem'          => $this->ordem[$compId] = ($this->ordem[$compId] ?? -1) + 1,
            'created_at'     => $now,
            'updated_at'     => $now,
        ];

        $t = &$this->totais[$compId];
        $cl = (string) $classe;
        $t['sem'] = ($t['sem'] ?? 0) + ($total ?? 0);
        if (str_starts_with($cl, 'MO')) $t['mod'] = ($t['mod'] ?? 0) + ($total ?? 0);
        elseif ($cl === 'MAT') $t['mat'] = ($t['mat'] ?? 0) + ($total ?? 0);
        elseif (str_starts_with($cl, 'EQ')) $t['eqp'] = ($t['eqp'] ?? 0) + ($total ?? 0);
        unset($t);
    }

    protected function flush(): void
    {
        if ($this->buffer) {
            TcpoComposicaoItem::insert($this->buffer);
            $this->buffer = [];
        }
    }

    protected function num($v): ?float
    {
        if ($v === null || $v === '') return null;
        $s = str_replace(["\xC2\xA0", ' ', 'R$'], '', (string) $v);
        if (is_numeric($s)) return (float) $s;
        $s = str_replace('.', '', $s);
        $s = str_replace(',', '.', $s);
        return is_numeric($s) ? (float) $s : null;
    }

    protected function resolverCaminho(string $arg): ?string
    {
        foreach ([$arg, base_path($arg), storage_path($arg)] as $cand) {
            if (is_file($cand)) {
                return realpath($cand) ?: $cand;
            }
        }
        return null;
    }
}
