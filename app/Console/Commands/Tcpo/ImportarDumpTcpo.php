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
 * Importa um dump SQL do TCPOweb (export MariaDB com tabelas
 * categorias/servicos/insumos/composicoes) para o catálogo global tcpo_*.
 *
 * Estratégia (espelha estoque:etl-legado, mas a origem é um arquivo .sql):
 *   1) Cria um banco de STAGING e carrega o dump nele (isolado, sem colidir).
 *   2) ETL: lê categorias/servicos/insumos/composicoes do staging e faz upsert
 *      idempotente nas tabelas tcpo_* (mapeando ids do dump → ids do catálogo).
 *   3) Dropa o staging (a menos que --keep-staging).
 *
 * Mapeamento:
 *   categorias(id,nome,pai_id)                    → tcpo_categorias (parent via pai_id)
 *   insumos(codigo,descricao,unidade,classe)      → tcpo_insumos
 *   servicos(codigo,descricao,unidade,tipo,base,categoria_id) → tcpo_composicoes
 *   composicoes(servico_id,insumo_id,coef,preco_unitario,total_sem_taxas,consumo)
 *                                                 → tcpo_composicao_itens
 *   (preço derivado de total_sem_taxas/coeficiente quando preco_unitario é NULL)
 *
 * Uso:
 *   php artisan tcpo:importar-dump docs/tcpoweb_mariadb_2026-06-20.sql
 *   php artisan tcpo:importar-dump <arq> --reset        # zera a base TCPO antes
 *   php artisan tcpo:importar-dump <arq> --keep-staging # mantém o banco staging
 */
class ImportarDumpTcpo extends Command
{
    protected $signature = 'tcpo:importar-dump
                            {arquivo          : Caminho do .sql (absoluto ou relativo à raiz)}
                            {--base=TCPO      : Rótulo da base no catálogo}
                            {--reset          : APAGA os dados TCPO desta base antes de importar}
                            {--keep-staging   : Não dropa o banco de staging ao final}';

    protected string $stagingDb = 'tcpoweb_dump_staging';
    protected string $conn = 'tcpo_dump_staging';
    protected string $base = 'TCPO';

    /** dump id → tcpo id */
    protected array $mapCategoria = [];
    protected array $mapInsumo = [];      // dump insumo id → tcpo_insumo id
    protected array $insumoInfo = [];     // dump insumo id → ['codigo','descricao','unidade','classe']
    protected array $mapServico = [];     // dump servico id → tcpo_composicao id

    public function handle(): int
    {
        $this->base = (string) $this->option('base') ?: 'TCPO';

        $caminho = $this->resolverCaminho((string) $this->argument('arquivo'));
        if (!$caminho) {
            $this->error('Arquivo não encontrado: ' . $this->argument('arquivo'));
            return self::FAILURE;
        }

        $this->info('=== Importação de dump TCPO → catálogo ===');
        $this->line('Arquivo: <info>' . $caminho . '</info>');
        $this->line('Base:    <info>' . $this->base . '</info>');

        // -------- Staging --------
        try {
            $this->prepararStaging($caminho);
        } catch (\Throwable $e) {
            $this->error('Falha ao carregar o dump no staging: ' . $e->getMessage());
            return self::FAILURE;
        }

        $st = DB::connection($this->conn);
        $resumo = [
            'categorias'  => $st->table('categorias')->count(),
            'servicos'    => $st->table('servicos')->count(),
            'insumos'     => $st->table('insumos')->count(),
            'composicoes' => $st->table('composicoes')->count(),
        ];
        $this->line(sprintf(
            'Staging carregado: %d categorias, %d serviços, %d insumos, %d itens',
            $resumo['categorias'], $resumo['servicos'], $resumo['insumos'], $resumo['composicoes']
        ));

        // -------- Reset --------
        if ($this->option('reset')) {
            if ($this->input->isInteractive() && !$this->confirm("--reset apaga TODOS os dados TCPO da base '{$this->base}'. Continuar?", false)) {
                $this->limparStaging();
                return self::FAILURE;
            }
            $this->warn('Zerando base TCPO…');
            TcpoComposicao::where('base', $this->base)->forceDelete();
            TcpoInsumo::where('base', $this->base)->forceDelete();
            TcpoCategoria::where('base', $this->base)->forceDelete();
        }

        $imp = TcpoImportacao::create([
            'base'        => $this->base,
            'escopo'      => 'Dump SQL: ' . basename($caminho),
            'status'      => TcpoImportacao::STATUS_RUNNING,
            'started_at'  => now(),
            'total_composicoes_previsto' => $resumo['servicos'],
        ]);

        try {
            $this->importarCategorias($st);
            $this->importarInsumos($st);
            $this->importarServicos($st);
            $nItens = $this->importarItens($st);

            $imp->update([
                'status'                       => TcpoImportacao::STATUS_SUCCESS,
                'finished_at'                  => now(),
                'total_categorias'             => count($this->mapCategoria),
                'total_insumos'                => count($this->mapInsumo),
                'total_composicoes_importadas' => count($this->mapServico),
                'total_itens'                  => $nItens,
            ]);

            $this->newLine();
            $this->info('=== Importação concluída ===');
            $this->line(sprintf(
                '  %d categorias, %d insumos, %d composições, %d itens',
                count($this->mapCategoria), count($this->mapInsumo), count($this->mapServico), $nItens
            ));
        } catch (\Throwable $e) {
            $imp->update(['status' => TcpoImportacao::STATUS_FAILED, 'finished_at' => now(), 'erro_global' => $e->getMessage()]);
            $this->error('Falha no ETL: ' . $e->getMessage());
            $this->limparStaging();
            return self::FAILURE;
        }

        $this->limparStaging();
        return self::SUCCESS;
    }

    // -----------------------------------------------------------------------

    protected function prepararStaging(string $caminho): void
    {
        $cfg = config('database.connections.' . config('database.default'));
        DB::statement("CREATE DATABASE IF NOT EXISTS `{$this->stagingDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        config(['database.connections.' . $this->conn => array_merge($cfg, ['database' => $this->stagingDb])]);
        DB::purge($this->conn);

        // Limpa tabelas anteriores do staging (idempotente) e carrega o dump.
        $st = DB::connection($this->conn);
        foreach (['composicoes', 'servicos', 'insumos', 'categorias'] as $t) {
            $st->statement("DROP TABLE IF EXISTS `{$t}`");
        }
        $sql = file_get_contents($caminho);
        $st->unprepared($sql);
    }

    protected function limparStaging(): void
    {
        if ($this->option('keep-staging')) {
            $this->line('Staging mantido: ' . $this->stagingDb);
            return;
        }
        try {
            DB::purge($this->conn);
            DB::statement("DROP DATABASE IF EXISTS `{$this->stagingDb}`");
        } catch (\Throwable $e) {
            $this->warn('Não consegui dropar o staging: ' . $e->getMessage());
        }
    }

    /** Categorias: árvore via pai_id. Idempotente por (base, legacy_path='dump:cat:{id}'). */
    protected function importarCategorias($st): void
    {
        $this->newLine();
        $this->info('--- Categorias ---');
        $cats = $st->table('categorias')->orderBy('id')->get();

        // Pré-carrega mapeamentos existentes.
        foreach (TcpoCategoria::where('base', $this->base)->whereNotNull('legacy_path')->get(['id', 'legacy_path']) as $c) {
            if (preg_match('/^dump:cat:(\d+)$/', (string) $c->legacy_path, $m)) {
                $this->mapCategoria[(int) $m[1]] = $c->id;
            }
        }

        // Múltiplas passadas até resolver todos os parents (árvore pode estar fora de ordem).
        $pendentes = $cats->all();
        $bar = $this->output->createProgressBar(count($pendentes));
        $bar->start();
        $loops = 0;
        while ($pendentes && $loops++ < 20) {
            $aindaPendentes = [];
            foreach ($pendentes as $cat) {
                $paiId = $cat->pai_id ? ($this->mapCategoria[$cat->pai_id] ?? false) : null;
                if ($paiId === false) { // pai ainda não mapeado
                    $aindaPendentes[] = $cat;
                    continue;
                }
                $nivel = $paiId ? (1 + (int) (TcpoCategoria::where('id', $paiId)->value('nivel') ?? 0)) : 0;
                $codigo = preg_match('/^(\d+)\./', $cat->nome, $mm) ? $mm[1] : null;

                $c = TcpoCategoria::firstOrNew(['base' => $this->base, 'legacy_path' => 'dump:cat:' . $cat->id]);
                $c->parent_id = $paiId;
                $c->nome      = $cat->nome;
                $c->codigo    = $codigo;
                $c->nivel     = $nivel;
                $c->save();
                $this->mapCategoria[$cat->id] = $c->id;
                $bar->advance();
            }
            $pendentes = $aindaPendentes;
        }
        $bar->finish();
        $this->newLine();
        if ($pendentes) {
            $this->warn('  ' . count($pendentes) . ' categorias sem pai resolvível (ignoradas).');
        }
    }

    /** Insumos: upsert por (base, codigo). */
    protected function importarInsumos($st): void
    {
        $this->newLine();
        $this->info('--- Insumos ---');
        $insumos = $st->table('insumos')->orderBy('id')->get();

        $existentes = TcpoInsumo::where('base', $this->base)->pluck('id', 'codigo')->all();

        $bar = $this->output->createProgressBar(count($insumos));
        $bar->start();
        foreach ($insumos as $ins) {
            $this->insumoInfo[$ins->id] = [
                'codigo'    => $ins->codigo,
                'descricao' => $ins->descricao,
                'unidade'   => $ins->unidade,
                'classe'    => $ins->classe ? strtoupper($ins->classe) : null,
            ];
            $tcpoId = $existentes[$ins->codigo] ?? null;
            if (!$tcpoId) {
                $i = TcpoInsumo::firstOrNew(['base' => $this->base, 'codigo' => $ins->codigo]);
                $i->descricao = $ins->descricao;
                $i->unidade   = $ins->unidade;
                $i->classe    = $ins->classe ? strtoupper($ins->classe) : null;
                $i->ativo     = true;
                $i->save();
                $tcpoId = $i->id;
                $existentes[$ins->codigo] = $tcpoId;
            }
            $this->mapInsumo[$ins->id] = $tcpoId;
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
    }

    /** Serviços → composições. Upsert por (base, codigo). */
    protected function importarServicos($st): void
    {
        $this->newLine();
        $this->info('--- Serviços (composições) ---');
        $servicos = $st->table('servicos')->orderBy('id')->get();

        $bar = $this->output->createProgressBar(count($servicos));
        $bar->start();
        foreach ($servicos as $s) {
            $c = TcpoComposicao::firstOrNew(['base' => $this->base, 'codigo' => $s->codigo]);
            $c->codigo_alt   = $s->codigo;                 // o dump usa o código EAP
            $c->categoria_id = $this->mapCategoria[$s->categoria_id] ?? null;
            $c->tipo         = $s->tipo;
            $c->unidade      = $s->unidade;
            $c->descricao    = $s->descricao;
            $c->ativo        = true;
            $c->save();
            $this->mapServico[$s->id] = $c->id;
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
    }

    /** Itens: substitui os itens de cada composição e recomputa os totais. */
    protected function importarItens($st): int
    {
        $this->newLine();
        $this->info('--- Itens (detalhamento) ---');

        // Apaga itens das composições que serão repovoadas.
        $compIds = array_values($this->mapServico);
        TcpoComposicaoItem::whereIn('composicao_id', $compIds)->delete();

        $total = $st->table('composicoes')->count();
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $totais = []; // compId => ['sem'=>,'mod'=>,'mat'=>,'eqp'=>]
        $ordem = [];
        $n = 0;

        $st->table('composicoes')->orderBy('servico_id')->orderBy('id')->chunk(500, function ($itens) use (&$totais, &$ordem, &$n, $bar) {
            foreach ($itens as $it) {
                $compId = $this->mapServico[$it->servico_id] ?? null;
                if (!$compId) { $bar->advance(); continue; }
                $info = $this->insumoInfo[$it->insumo_id] ?? null;
                $insumoId = $this->mapInsumo[$it->insumo_id] ?? null;

                $coef  = $it->coeficiente !== null ? (float) $it->coeficiente : null;
                $total = $it->total_sem_taxas !== null ? (float) $it->total_sem_taxas : null;
                $preco = $it->preco_unitario !== null ? (float) $it->preco_unitario : null;
                if ($preco === null && $coef && $total !== null) {
                    $preco = round($total / $coef, 4);
                }
                $classe = $info['classe'] ?? null;

                TcpoComposicaoItem::create([
                    'composicao_id'     => $compId,
                    'insumo_id'         => $insumoId,
                    'codigo'            => $info['codigo'] ?? null,
                    'descricao'         => $info['descricao'] ?? null,
                    'unidade'           => $info['unidade'] ?? null,
                    'classe'            => $classe,
                    'coeficiente'       => $coef ?? 0,
                    'consumo'           => $it->consumo !== null ? (float) $it->consumo : null,
                    'preco_unitario'    => $preco,
                    'total'             => $total,
                    'ordem'             => $ordem[$compId] = ($ordem[$compId] ?? -1) + 1,
                ]);

                $t = &$totais[$compId];
                $t['sem'] = ($t['sem'] ?? 0) + ($total ?? 0);
                if ($classe === 'MOD') $t['mod'] = ($t['mod'] ?? 0) + ($total ?? 0);
                elseif ($classe === 'MAT') $t['mat'] = ($t['mat'] ?? 0) + ($total ?? 0);
                elseif ($classe === 'EQP') $t['eqp'] = ($t['eqp'] ?? 0) + ($total ?? 0);
                unset($t);
                $n++;
                $bar->advance();
            }
        });
        $bar->finish();
        $this->newLine();

        // Atualiza totais das composições.
        foreach ($totais as $compId => $t) {
            TcpoComposicao::where('id', $compId)->update([
                'total_sem_taxas' => round($t['sem'] ?? 0, 4),
                'total_mod'       => round($t['mod'] ?? 0, 4),
                'total_mat'       => round($t['mat'] ?? 0, 4),
                'total_eqp'       => round($t['eqp'] ?? 0, 4),
            ]);
        }

        return $n;
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
