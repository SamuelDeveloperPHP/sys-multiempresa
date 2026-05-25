<?php

namespace App\Console\Commands\Estoque;

use App\Models\Estoque\Categoria;
use App\Models\Estoque\Produto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * ETL — importa o catálogo do sistema legado (banco 'scraping' /
 * projeto sync-products) para o catálogo global do sys-multiempresa.
 *
 * Tabelas de origem (read-only via conexão 'scraping'):
 *   estoque_categoria_principal   (~30 rows)
 *   estoque_categoria_primaria    (~357 rows)
 *   estoque_categoria_secundaria  (~997 rows)
 *   estoque                       (~155k produtos)
 *
 * Tabelas de destino:
 *   estoque_categorias   (árvore parent_id, company_id=null)
 *   estoque_produtos     (catálogo global, company_id=null)
 *
 * Estratégia:
 *   1) Importa as 30 principais → árvore raiz
 *   2) Importa as 357 primárias → filhas das principais
 *   3) Importa as 997 secundárias → filhas das primárias
 *   4) Importa 155k produtos em chunks de 1000, mapeando
 *      categoria_id para a SECUNDÁRIA (mais específica) — fallback
 *      para primária ou principal se faltar.
 *
 * Idempotente: usa legacy_kind+legacy_id (categorias) e legacy_sku
 * (produtos) como chave de upsert. Pode rodar várias vezes.
 *
 * Uso:
 *   php artisan estoque:etl-legado
 *   php artisan estoque:etl-legado --dry-run
 *   php artisan estoque:etl-legado --limit=100
 *   php artisan estoque:etl-legado --skip-produtos
 *   php artisan estoque:etl-legado --reset
 */
class EtlLegado extends Command
{
    protected $signature = 'estoque:etl-legado
                            {--dry-run         : Não persiste, apenas mostra estatísticas}
                            {--limit=          : Limita N produtos (para testes)}
                            {--skip-categorias : Pula importação de categorias}
                            {--skip-produtos   : Pula importação de produtos}
                            {--reset           : APAGA catálogo atual antes de importar (perigoso)}';

    protected $description = 'Importa categorias + produtos do banco legado scraping';

    // Cache: legacy_id → novo id (para mapear FKs entre passos)
    protected array $mapPrincipal = []; // legacy_id principal → new id
    protected array $mapPrimaria  = []; // legacy_id primaria  → new id
    protected array $mapSecundaria = []; // legacy_id secundaria → new id

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit  = $this->option('limit') ? (int) $this->option('limit') : null;
        $reset  = (bool) $this->option('reset');

        // -------- Pré-flight --------
        $this->info('=== ETL Catálogo Legado (scraping → sys-multiempresa) ===');
        $this->line($dryRun ? '<comment>MODO DRY-RUN (não persiste)</comment>' : '<info>Modo persistência ATIVO</info>');

        try {
            $cnt = DB::connection('scraping')->table('estoque')->count();
            $this->line("Conexão scraping OK. Produtos disponíveis: <info>{$cnt}</info>");
        } catch (\Throwable $e) {
            $this->error('Não consegui conectar ao banco scraping: ' . $e->getMessage());
            return self::FAILURE;
        }

        // -------- Reset --------
        if ($reset && !$dryRun) {
            if (!$this->confirm('ATENÇÃO: --reset apaga TODOS os produtos e categorias atuais. Continuar?', false)) {
                return self::FAILURE;
            }
            $this->warn('Apagando catálogo atual…');
            Produto::query()->forceDelete();
            Categoria::query()->forceDelete();
            $this->info('OK — catálogo zerado.');
        }

        // -------- Carrega caches de mapeamento já existentes (idempotência) --------
        $this->loadExistingMappings();

        // -------- Categorias --------
        if (!$this->option('skip-categorias')) {
            $this->importarCategorias($dryRun);
        }

        // -------- Produtos --------
        if (!$this->option('skip-produtos')) {
            $this->importarProdutos($dryRun, $limit);
        }

        $this->newLine();
        $this->info('=== ETL concluído ===');
        return self::SUCCESS;
    }

    // -----------------------------------------------------------------------

    protected function loadExistingMappings(): void
    {
        foreach (Categoria::query()->whereNotNull('legacy_id')->whereNotNull('legacy_kind')->get(['id', 'legacy_id', 'legacy_kind']) as $c) {
            $key = (int) $c->legacy_id;
            if ($c->legacy_kind === 'principal')   $this->mapPrincipal[$key]   = $c->id;
            if ($c->legacy_kind === 'primaria')    $this->mapPrimaria[$key]    = $c->id;
            if ($c->legacy_kind === 'secundaria')  $this->mapSecundaria[$key]  = $c->id;
        }
        if (!empty($this->mapPrincipal) || !empty($this->mapPrimaria) || !empty($this->mapSecundaria)) {
            $this->line(sprintf(
                '  Cache pré-existente: %d principais, %d primárias, %d secundárias',
                count($this->mapPrincipal),
                count($this->mapPrimaria),
                count($this->mapSecundaria)
            ));
        }
    }

    protected function importarCategorias(bool $dryRun): void
    {
        $this->newLine();
        $this->info('--- Importando categorias ---');

        // 1) Principais
        $principais = DB::connection('scraping')->table('estoque_categoria_principal')->get();
        $this->withProgress('Principais', $principais, function ($p) use ($dryRun) {
            $id = $this->upsertCategoria(
                kind: 'principal',
                legacyId: (int) $p->id,
                nome: $p->nome_categoria_princ,
                parentId: null,
                dryRun: $dryRun,
            );
            if ($id) $this->mapPrincipal[(int) $p->id] = $id;
        });

        // 2) Primárias (parent = principal mapeada)
        $primarias = DB::connection('scraping')->table('estoque_categoria_primaria')->get();
        $this->withProgress('Primárias', $primarias, function ($p) use ($dryRun) {
            $parentNewId = $this->mapPrincipal[(int) $p->id_categoria_principal] ?? null;
            $id = $this->upsertCategoria(
                kind: 'primaria',
                legacyId: (int) $p->id,
                nome: $p->nome_categoria_primaria,
                parentId: $parentNewId,
                dryRun: $dryRun,
            );
            if ($id) $this->mapPrimaria[(int) $p->id] = $id;
        });

        // 3) Secundárias (parent = primária mapeada)
        $secundarias = DB::connection('scraping')->table('estoque_categoria_secundaria')->get();
        $this->withProgress('Secundárias', $secundarias, function ($p) use ($dryRun) {
            $parentNewId = $this->mapPrimaria[(int) $p->id_categoria_primaria] ?? null;
            $id = $this->upsertCategoria(
                kind: 'secundaria',
                legacyId: (int) $p->id,
                nome: $p->nome_categoria_secundaria,
                parentId: $parentNewId,
                dryRun: $dryRun,
            );
            if ($id) $this->mapSecundaria[(int) $p->id] = $id;
        });
    }

    /**
     * Insere ou atualiza categoria pela chave (legacy_kind, legacy_id).
     * Retorna o ID gravado (ou pseudo-id em dry-run).
     */
    protected function upsertCategoria(string $kind, int $legacyId, string $nome, ?int $parentId, bool $dryRun): ?int
    {
        if ($dryRun) {
            return $legacyId; // pseudo-id só para popular o cache
        }

        $cat = Categoria::firstOrNew(['legacy_kind' => $kind, 'legacy_id' => $legacyId]);
        $cat->company_id = null;          // catálogo global
        $cat->parent_id  = $parentId;
        $cat->nome       = trim($nome);
        $cat->ativo      = true;
        $cat->user_create = $cat->user_create ?: 'etl@sistema';
        $cat->save();
        return $cat->id;
    }

    protected function importarProdutos(bool $dryRun, ?int $limit): void
    {
        $this->newLine();
        $this->info('--- Importando produtos ---');

        $base = DB::connection('scraping')->table('estoque')->orderBy('id');
        if ($limit) {
            $base->limit($limit);
        }
        $total = $limit ?? DB::connection('scraping')->table('estoque')->count();
        $this->line("Total a processar: <info>{$total}</info>");

        $bar = $this->output->createProgressBar($total);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% — %elapsed:6s%/%estimated:-6s% — %message%');
        $bar->setMessage('iniciando…');
        $bar->start();

        $stats = ['inseridos' => 0, 'atualizados' => 0, 'pulados_sem_categoria' => 0, 'erros' => 0];
        $chunkSize = 500;

        $base->chunk($chunkSize, function ($rows) use (&$stats, $bar, $dryRun) {
            foreach ($rows as $r) {
                try {
                    // Categoria preferencial: secundária → primária → principal
                    $catId = null;
                    if (!empty($r->id_categoria_secundaria) && isset($this->mapSecundaria[(int) $r->id_categoria_secundaria])) {
                        $catId = $this->mapSecundaria[(int) $r->id_categoria_secundaria];
                    } elseif (!empty($r->id_categoria_primaria) && isset($this->mapPrimaria[(int) $r->id_categoria_primaria])) {
                        $catId = $this->mapPrimaria[(int) $r->id_categoria_primaria];
                    } elseif (!empty($r->id_categoria_principal) && isset($this->mapPrincipal[(int) $r->id_categoria_principal])) {
                        $catId = $this->mapPrincipal[(int) $r->id_categoria_principal];
                    }

                    if (!$catId) {
                        $stats['pulados_sem_categoria']++;
                    }

                    if ($dryRun) {
                        $stats['inseridos']++;
                    } else {
                        $sku = trim((string) $r->id_produto) ?: ('LEG-' . $r->id);
                        $produto = Produto::firstOrNew(['legacy_sku' => $sku]);
                        $isNew = !$produto->exists;

                        $produto->company_id           = null; // catálogo global
                        $produto->categoria_id         = $catId;
                        $produto->sku                  = $sku;
                        $produto->nome                 = trim((string) $r->nome_produto);
                        $produto->marca                = trim((string) $r->id_marca) ?: null;
                        $produto->unidade              = $this->mapUnidade($r->unidade);
                        $produto->valor_unitario       = (float) ($r->valor_unitario ?? 0);
                        $produto->valor_ultima_entrada = (float) ($r->valor_unitario ?? 0);
                        $produto->imagem               = trim((string) $r->image) ?: null;
                        $produto->ativo                = (int) $r->status_produto === 1;
                        $produto->legacy_id_categoria_principal  = $r->id_categoria_principal ? (int) $r->id_categoria_principal : null;
                        $produto->legacy_id_categoria_primaria   = $r->id_categoria_primaria  ? (int) $r->id_categoria_primaria  : null;
                        $produto->legacy_id_categoria_secundaria = $r->id_categoria_secundaria ? (int) $r->id_categoria_secundaria : null;
                        $produto->user_create          = $produto->user_create ?: 'etl@sistema';

                        $produto->save();
                        $isNew ? $stats['inseridos']++ : $stats['atualizados']++;
                    }
                } catch (\Throwable $e) {
                    $stats['erros']++;
                    \Log::warning('[etl-legado] erro produto', [
                        'id' => $r->id, 'sku' => $r->id_produto ?? null, 'msg' => $e->getMessage(),
                    ]);
                }
                $bar->advance();
            }
            $bar->setMessage(sprintf(
                '%d inseridos, %d atualizados, %d s/categ, %d erros',
                $stats['inseridos'], $stats['atualizados'], $stats['pulados_sem_categoria'], $stats['erros']
            ));
        });

        $bar->finish();
        $this->newLine(2);
        $this->info('Produtos: ' . $stats['inseridos'] . ' inseridos, ' . $stats['atualizados'] . ' atualizados');
        if ($stats['pulados_sem_categoria'] > 0) {
            $this->warn('  ' . $stats['pulados_sem_categoria'] . ' produtos ficaram sem categoria (FK legado faltando).');
        }
        if ($stats['erros'] > 0) {
            $this->error('  ' . $stats['erros'] . ' erros — ver storage/logs/laravel.log');
        }
    }

    /**
     * Normaliza a unidade do legado (livre) para uma das válidas no novo schema.
     */
    protected function mapUnidade(?string $u): string
    {
        $u = strtolower(trim((string) $u));
        return match (true) {
            $u === '' || $u === 'cada' || $u === 'un' || $u === 'unidade' => 'UN',
            in_array($u, ['kg', 'quilo', 'quilograma'], true)              => 'KG',
            in_array($u, ['g', 'grama'], true)                              => 'G',
            in_array($u, ['l', 'litro', 'lts'], true)                       => 'L',
            in_array($u, ['ml', 'mililitro'], true)                         => 'ML',
            in_array($u, ['m', 'metro'], true)                              => 'M',
            in_array($u, ['m2', 'm²', 'metro quadrado'], true)             => 'M2',
            in_array($u, ['m3', 'm³', 'metro cubico', 'metro cúbico'], true) => 'M3',
            in_array($u, ['cx', 'caixa'], true)                             => 'CX',
            in_array($u, ['pc', 'peca', 'peça'], true)                      => 'PC',
            in_array($u, ['par'], true)                                     => 'PAR',
            in_array($u, ['sc', 'saco'], true)                              => 'SC',
            in_array($u, ['pct', 'pacote'], true)                           => 'PCT',
            default                                                          => 'UN',
        };
    }

    protected function withProgress(string $label, $iterable, callable $each): void
    {
        $count = is_countable($iterable) ? count($iterable) : iterator_count($iterable);
        $this->line("  $label ($count)…");
        $bar = $this->output->createProgressBar($count);
        $bar->start();
        foreach ($iterable as $item) {
            $each($item);
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();
    }
}
