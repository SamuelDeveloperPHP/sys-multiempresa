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
 * Importa um arquivo de COLHEITA do TCPOweb (JSON) para o catálogo global.
 *
 * Origem: arquivo JSON gerado pelo harvester (navegador autenticado), no
 * formato documentado abaixo. Como o TCPOweb é ASP.NET WebForms (postback +
 * VIEWSTATE, sem API), a extração é feita à parte; este comando só importa.
 *
 * Destino:
 *   tcpo_categorias        (árvore EAP, global)
 *   tcpo_insumos           (catálogo MOD/MAT/EQP, global)
 *   tcpo_composicoes       (serviços, global)
 *   tcpo_composicao_itens  (detalhamento: composição → insumo/sub)
 *
 * Idempotente: upsert por (base, legacy_path) nas categorias, (base, codigo)
 * nos insumos e composições; os itens da composição são substituídos por
 * inteiro a cada importação. Pode rodar várias vezes com segurança.
 *
 * Formato do JSON:
 * {
 *   "base": "TCPO",
 *   "preco_regiao": "São Paulo",
 *   "preco_data": "2026/04",
 *   "escopo": "Capítulo 06 - Alvenarias",
 *   "categorias": [
 *     {"legacy_path":"Serviços>06...","codigo":"06","nome":"Alvenarias...","parent_path":null,"nivel":0,"ordem":0}
 *   ],
 *   "composicoes": [
 *     {
 *       "codigo":"3R 05 12 00 00 00 00 06 18","codigo_alt":"06.101.000350.SER",
 *       "tipo":"SERVIÇO COMPOSTO","unidade":"m²","descricao":"Alvenaria...",
 *       "categoria_path":"Serviços>06...","total_sem_taxas":208.96,"total_com_taxas":225.72,
 *       "total_mod":12.89,"total_mat":196.07,"total_eqp":0,
 *       "itens":[
 *         {"codigo":"2N 36 16 25 12 29","descricao":"Pedreiro","unidade":"h","classe":"MOD",
 *          "coeficiente":0.71,"consumo":0.71,"preco_unitario":12.12,"total":8.61}
 *       ]
 *     }
 *   ]
 * }
 *
 * Uso:
 *   php artisan tcpo:importar storage/app/tcpo/capitulo-06.json
 *   php artisan tcpo:importar caminho.json --dry-run
 *   php artisan tcpo:importar caminho.json --reset
 */
class ImportarTcpo extends Command
{
    protected $signature = 'tcpo:importar
                            {arquivo           : Caminho do JSON de colheita (absoluto ou relativo à raiz do projeto)}
                            {--dry-run         : Não persiste, apenas valida e mostra estatísticas}
                            {--reset           : APAGA os dados da base informada antes de importar (perigoso)}';

    protected $description = 'Importa composições/insumos do TCPOweb (JSON de colheita) para o catálogo global';

    /** legacy_path → id (categorias). */
    protected array $mapCategoria = [];
    /** codigo → id (insumos). */
    protected array $mapInsumo = [];
    /** codigo → id (composições). */
    protected array $mapComposicao = [];

    protected string $base = 'TCPO';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        // -------- Carrega e valida o arquivo --------
        $caminho = $this->resolverCaminho($this->argument('arquivo'));
        if (!$caminho || !is_file($caminho)) {
            $this->error("Arquivo não encontrado: {$this->argument('arquivo')}");
            return self::FAILURE;
        }

        $dados = json_decode((string) file_get_contents($caminho), true);
        if (!is_array($dados) || !isset($dados['composicoes'])) {
            $this->error('JSON inválido ou sem a chave "composicoes".');
            return self::FAILURE;
        }

        $this->base = trim((string) ($dados['base'] ?? 'TCPO')) ?: 'TCPO';
        $regiao = $dados['preco_regiao'] ?? null;
        $data   = $dados['preco_data'] ?? null;
        $escopo = $dados['escopo'] ?? null;

        $categorias  = $dados['categorias'] ?? [];
        $composicoes = $dados['composicoes'] ?? [];

        $this->info('=== Importação TCPO (JSON → sys-multiempresa) ===');
        $this->line("Arquivo : <info>{$caminho}</info>");
        $this->line("Base    : <info>{$this->base}</info>  Região: <info>" . ($regiao ?: '—') . "</info>  Data: <info>" . ($data ?: '—') . "</info>");
        $this->line("Escopo  : <info>" . ($escopo ?: '—') . "</info>");
        $this->line(sprintf('Conteúdo: <info>%d</info> categorias, <info>%d</info> composições', count($categorias), count($composicoes)));
        $this->line($dryRun ? '<comment>MODO DRY-RUN (não persiste)</comment>' : '<info>Modo persistência ATIVO</info>');

        // -------- Reset --------
        if ($this->option('reset') && !$dryRun) {
            if (!$this->confirm("ATENÇÃO: --reset apaga TODOS os dados TCPO da base '{$this->base}'. Continuar?", false)) {
                return self::FAILURE;
            }
            $this->resetBase();
        }

        // -------- Log de importação --------
        $imp = $dryRun ? null : TcpoImportacao::create([
            'user_id'                    => null,
            'base'                       => $this->base,
            'escopo'                     => $escopo,
            'status'                     => TcpoImportacao::STATUS_RUNNING,
            'started_at'                 => now(),
            'total_composicoes_previsto' => count($composicoes),
        ]);

        try {
            $this->importarCategorias($categorias, $dryRun);
            $this->importarInsumos($composicoes, $regiao, $data, $dryRun);
            [$nComp, $nItens, $nFalhas] = $this->importarComposicoes($composicoes, $regiao, $data, $dryRun);

            if ($imp) {
                $imp->update([
                    'status'                       => $nFalhas > 0 ? TcpoImportacao::STATUS_PARTIAL : TcpoImportacao::STATUS_SUCCESS,
                    'finished_at'                  => now(),
                    'total_categorias'             => count($this->mapCategoria),
                    'total_insumos'                => count($this->mapInsumo),
                    'total_composicoes_importadas' => $nComp,
                    'total_itens'                  => $nItens,
                    'total_falhas'                 => $nFalhas,
                ]);
            }

            $this->newLine();
            $this->info('=== Importação concluída ===');
            $this->line(sprintf(
                '  %d categorias, %d insumos, %d composições, %d itens%s',
                count($this->mapCategoria), count($this->mapInsumo), $nComp, $nItens,
                $nFalhas ? ", <comment>{$nFalhas} falhas</comment>" : ''
            ));
            return self::SUCCESS;
        } catch (\Throwable $e) {
            if ($imp) {
                $imp->update([
                    'status'      => TcpoImportacao::STATUS_FAILED,
                    'finished_at' => now(),
                    'erro_global' => $e->getMessage(),
                ]);
            }
            $this->error('Falha na importação: ' . $e->getMessage());
            return self::FAILURE;
        }
    }

    // -----------------------------------------------------------------------

    protected function resolverCaminho(string $arg): ?string
    {
        if (is_file($arg)) {
            return realpath($arg) ?: $arg;
        }
        $candidato = base_path($arg);
        if (is_file($candidato)) {
            return $candidato;
        }
        $candidato = storage_path($arg);
        return is_file($candidato) ? $candidato : null;
    }

    protected function resetBase(): void
    {
        $this->warn("Apagando dados TCPO da base '{$this->base}'…");
        // Itens caem por cascade ao apagar composições.
        TcpoComposicao::where('base', $this->base)->forceDelete();
        TcpoInsumo::where('base', $this->base)->forceDelete();
        TcpoCategoria::where('base', $this->base)->forceDelete();
        $this->info('OK — base zerada.');
    }

    /**
     * Categorias: upsert por (base, legacy_path), resolvendo parent pelo
     * parent_path. Importa em ordem de nível para o parent já existir.
     */
    protected function importarCategorias(array $categorias, bool $dryRun): void
    {
        if (empty($categorias)) {
            return;
        }
        $this->newLine();
        $this->info('--- Categorias ---');

        usort($categorias, fn ($a, $b) => ((int) ($a['nivel'] ?? 0)) <=> ((int) ($b['nivel'] ?? 0)));

        // Pré-carrega mapeamentos já existentes (idempotência entre execuções).
        if (!$dryRun) {
            foreach (TcpoCategoria::where('base', $this->base)->whereNotNull('legacy_path')->get(['id', 'legacy_path']) as $c) {
                $this->mapCategoria[$c->legacy_path] = $c->id;
            }
        }

        $this->withProgress('Categorias', $categorias, function ($cat) use ($dryRun) {
            $path = (string) ($cat['legacy_path'] ?? '');
            if ($path === '') {
                return;
            }
            $parentId = isset($cat['parent_path']) && $cat['parent_path'] !== null
                ? ($this->mapCategoria[$cat['parent_path']] ?? null)
                : null;

            if ($dryRun) {
                $this->mapCategoria[$path] = $this->mapCategoria[$path] ?? -1;
                return;
            }

            $c = TcpoCategoria::firstOrNew(['base' => $this->base, 'legacy_path' => $path]);
            $c->parent_id = $parentId;
            $c->codigo    = $cat['codigo'] ?? $c->codigo;
            $c->nome      = trim((string) ($cat['nome'] ?? $c->nome ?? $path));
            $c->nivel     = (int) ($cat['nivel'] ?? 0);
            $c->ordem     = (int) ($cat['ordem'] ?? 0);
            $c->save();
            $this->mapCategoria[$path] = $c->id;
        });
    }

    /**
     * Insumos: deriva do conjunto de itens de todas as composições (dedup por
     * código), upsert por (base, codigo) com o snapshot de preço.
     */
    protected function importarInsumos(array $composicoes, ?string $regiao, ?string $data, bool $dryRun): void
    {
        $this->newLine();
        $this->info('--- Insumos ---');

        // Dedup: codigo → melhor linha (mantém última vista, preço incluso).
        $insumos = [];
        foreach ($composicoes as $comp) {
            foreach (($comp['itens'] ?? []) as $item) {
                $classe = $this->normalizarClasse($item['classe'] ?? null);
                if ($classe === TcpoComposicaoItem::CLASSE_SUB) {
                    continue; // sub-composição não é insumo
                }
                $codigo = trim((string) ($item['codigo'] ?? ''));
                if ($codigo === '') {
                    continue;
                }
                $insumos[$codigo] = [
                    'descricao'      => trim((string) ($item['descricao'] ?? '')),
                    'unidade'        => $item['unidade'] ?? null,
                    'classe'         => $classe,
                    'preco_unitario' => $this->num($item['preco_unitario'] ?? null) ?? 0,
                ];
            }
        }

        // Pré-carrega mapeamento existente.
        if (!$dryRun) {
            foreach (TcpoInsumo::where('base', $this->base)->get(['id', 'codigo']) as $i) {
                $this->mapInsumo[$i->codigo] = $i->id;
            }
        }

        $lista = collect($insumos)->map(fn ($v, $k) => ['codigo' => $k] + $v)->values()->all();
        $this->withProgress('Insumos', $lista, function ($ins) use ($regiao, $data, $dryRun) {
            if ($dryRun) {
                $this->mapInsumo[$ins['codigo']] = $this->mapInsumo[$ins['codigo']] ?? -1;
                return;
            }
            $i = TcpoInsumo::firstOrNew(['base' => $this->base, 'codigo' => $ins['codigo']]);
            $i->descricao      = $ins['descricao'] ?: ($i->descricao ?? $ins['codigo']);
            $i->unidade        = $ins['unidade'];
            $i->classe         = $ins['classe'];
            $i->preco_unitario = $ins['preco_unitario'];
            $i->preco_regiao   = $regiao;
            $i->preco_data     = $data;
            $i->ativo          = true;
            $i->save();
            $this->mapInsumo[$ins['codigo']] = $i->id;
        });
    }

    /**
     * Composições: upsert por (base, codigo) e substituição completa dos itens.
     * Retorna [nComposicoes, nItens, nFalhas].
     */
    protected function importarComposicoes(array $composicoes, ?string $regiao, ?string $data, bool $dryRun): array
    {
        $this->newLine();
        $this->info('--- Composições ---');

        // 1ª passada: upsert dos cabeçalhos (para resolver sub-composições depois).
        if (!$dryRun) {
            foreach ($composicoes as $comp) {
                $codigo = trim((string) ($comp['codigo'] ?? ''));
                if ($codigo === '') {
                    continue;
                }
                $catId = isset($comp['categoria_path']) ? ($this->mapCategoria[$comp['categoria_path']] ?? null) : null;
                $c = TcpoComposicao::firstOrNew(['base' => $this->base, 'codigo' => $codigo]);
                $c->categoria_id    = $catId;
                $c->codigo_alt      = $comp['codigo_alt'] ?? null;
                $c->tipo            = $comp['tipo'] ?? null;
                $c->unidade         = $comp['unidade'] ?? null;
                $c->descricao       = trim((string) ($comp['descricao'] ?? ''));
                $c->memorial_conteudo = $comp['memorial_conteudo'] ?? null;
                $c->memorial_criterio = $comp['memorial_criterio'] ?? null;
                $c->memorial_normas   = $comp['memorial_normas'] ?? null;
                $c->preco_regiao    = $regiao;
                $c->preco_data      = $data;
                $c->total_sem_taxas = $this->num($comp['total_sem_taxas'] ?? null);
                $c->total_com_taxas = $this->num($comp['total_com_taxas'] ?? null);
                $c->total_mod       = $this->num($comp['total_mod'] ?? null);
                $c->total_mat       = $this->num($comp['total_mat'] ?? null);
                $c->total_eqp       = $this->num($comp['total_eqp'] ?? null);
                $c->ativo           = true;
                $c->save();
                $this->mapComposicao[$codigo] = $c->id;
            }
        }

        // 2ª passada: substitui os itens de cada composição.
        $nComp = 0;
        $nItens = 0;
        $nFalhas = 0;
        $bar = $this->output->createProgressBar(count($composicoes));
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% — %message%');
        $bar->setMessage('iniciando…');
        $bar->start();

        foreach ($composicoes as $comp) {
            $codigo = trim((string) ($comp['codigo'] ?? ''));
            if ($codigo === '') {
                $bar->advance();
                continue;
            }
            try {
                if ($dryRun) {
                    $nComp++;
                    $nItens += count($comp['itens'] ?? []);
                } else {
                    $compId = $this->mapComposicao[$codigo] ?? null;
                    if (!$compId) {
                        throw new \RuntimeException("Composição {$codigo} não foi persistida.");
                    }
                    DB::transaction(function () use ($comp, $compId, &$nItens) {
                        TcpoComposicaoItem::where('composicao_id', $compId)->delete();
                        $ordem = 0;
                        foreach (($comp['itens'] ?? []) as $item) {
                            $classe = $this->normalizarClasse($item['classe'] ?? null);
                            $codItem = trim((string) ($item['codigo'] ?? ''));
                            $isSub = $classe === TcpoComposicaoItem::CLASSE_SUB;

                            TcpoComposicaoItem::create([
                                'composicao_id'     => $compId,
                                'insumo_id'         => $isSub ? null : ($this->mapInsumo[$codItem] ?? null),
                                'sub_composicao_id' => $isSub ? ($this->mapComposicao[$codItem] ?? null) : null,
                                'codigo'            => $codItem ?: null,
                                'descricao'         => trim((string) ($item['descricao'] ?? '')) ?: null,
                                'unidade'           => $item['unidade'] ?? null,
                                'classe'            => $classe,
                                'coeficiente'       => $this->num($item['coeficiente'] ?? null) ?? 0,
                                'consumo'           => $this->num($item['consumo'] ?? null),
                                'preco_unitario'    => $this->num($item['preco_unitario'] ?? null),
                                'total'             => $this->num($item['total'] ?? null),
                                'ordem'             => $ordem++,
                            ]);
                            $nItens++;
                        }
                    });
                    $nComp++;
                }
            } catch (\Throwable $e) {
                $nFalhas++;
                \Log::warning("[tcpo:importar] falha na composição {$codigo}: {$e->getMessage()}");
            }
            $bar->setMessage("{$nComp} comp, {$nItens} itens" . ($nFalhas ? ", {$nFalhas} falhas" : ''));
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        return [$nComp, $nItens, $nFalhas];
    }

    // -----------------------------------------------------------------------

    /** Normaliza a classe do item: MOD | MAT | EQP | SUB (null se desconhecida). */
    protected function normalizarClasse(?string $c): ?string
    {
        $c = strtoupper(trim((string) $c));
        return match (true) {
            in_array($c, ['MOD', 'MO', 'MÃO DE OBRA', 'MAO DE OBRA'], true) => TcpoInsumo::CLASSE_MOD,
            in_array($c, ['MAT', 'MATERIAL'], true)                          => TcpoInsumo::CLASSE_MAT,
            in_array($c, ['EQP', 'EQUIP', 'EQUIPAMENTO'], true)              => TcpoInsumo::CLASSE_EQP,
            in_array($c, ['SUB', 'SUBCOMP', 'SUB-COMPOSIÇÃO', 'SERVIÇO'], true) => TcpoComposicaoItem::CLASSE_SUB,
            default                                                          => $c ?: null,
        };
    }

    /** Converte número PT-BR ("1.234,56" / "12,875") ou já-float para float. */
    protected function num($v): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (is_int($v) || is_float($v)) {
            return (float) $v;
        }
        $s = str_replace(['R$', ' ', "\u{00A0}"], '', (string) $v);
        if (is_numeric($s)) {
            return (float) $s;
        }
        $s = str_replace('.', '', $s);   // separador de milhar
        $s = str_replace(',', '.', $s);  // decimal
        return is_numeric($s) ? (float) $s : null;
    }

    protected function withProgress(string $label, array $itens, callable $each): void
    {
        $this->line("  {$label} (" . count($itens) . ')…');
        $bar = $this->output->createProgressBar(count($itens));
        $bar->start();
        foreach ($itens as $item) {
            $each($item);
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
    }
}
