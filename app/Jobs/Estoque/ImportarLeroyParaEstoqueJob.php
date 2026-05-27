<?php

namespace App\Jobs\Estoque;

use App\Models\Estoque\Categoria;
use App\Models\Estoque\EstoqueImportacao;
use App\Models\Estoque\LeroyMerlin\LeroyCategoriaPrincipal;
use App\Models\Estoque\LeroyMerlin\LeroyProduto;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * PONTE — Job PAI: importa o catálogo de referência Leroy (estoque_leroy_*)
 * para o estoque OPERACIONAL global (estoque_categorias + estoque_produtos),
 * tornando os itens movimentáveis (entrada/saída/requisição).
 *
 * 1. Marca a EstoqueImportacao como RUNNING + total previsto.
 * 2. Espelha a hierarquia de categorias Leroy → estoque_categorias (árvore
 *    parent_id, 3 níveis), usando legacy_kind 'leroy_*' (namespace próprio,
 *    não colide com as categorias do ETL antigo). Idempotente.
 * 3. Despacha um Bus::batch com 1 filho por categoria-folha (secundária) →
 *    workers importam produtos em PARALELO.
 * 4. finally() marca success/partial.
 */
class ImportarLeroyParaEstoqueJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;
    public int $tries = 1;

    public function __construct(public int $importacaoId)
    {
    }

    public function uniqueId(): string
    {
        return 'estoque-import-leroy';
    }

    public function uniqueFor(): int
    {
        return 3600;
    }

    public function handle(): void
    {
        @ini_set('memory_limit', '1024M');

        $imp = EstoqueImportacao::find($this->importacaoId);
        if (!$imp) {
            Log::error("ImportarLeroyParaEstoqueJob: importacao #{$this->importacaoId} nao encontrada.");
            return;
        }

        $imp->update([
            'status'                  => EstoqueImportacao::STATUS_RUNNING,
            'started_at'              => now(),
            'total_produtos_previsto' => LeroyProduto::count(),
        ]);

        try {
            $fila = config('leroy.queue_import', 'estoque-import');
            $totalCategorias = 0;
            $jobs = [];

            // ---- Espelha categorias (3 níveis) e monta os jobs por secundária ----
            LeroyCategoriaPrincipal::with(['primarias.secundarias'])
                ->chunk(50, function ($principais) use (&$jobs, &$totalCategorias) {
                    foreach ($principais as $princ) {
                        $catPrinc = $this->upsertCategoria('leroy_principal', $princ->leroy_id, $princ->nome, null);
                        $totalCategorias++;

                        foreach ($princ->primarias as $prim) {
                            $catPrim = $this->upsertCategoria('leroy_primaria', $prim->leroy_id, $prim->nome, $catPrinc->id);
                            $totalCategorias++;

                            foreach ($prim->secundarias as $sec) {
                                $catSec = $this->upsertCategoria('leroy_secundaria', $sec->leroy_id, $sec->nome, $catPrim->id);
                                $totalCategorias++;

                                $jobs[] = new ImportarCategoriaLeroyJob(
                                    $this->importacaoId,
                                    (int) $sec->id,        // id da secundária no catálogo Leroy (FK dos produtos)
                                    (int) $catSec->id       // id da categoria-folha espelhada (estoque_categorias)
                                );
                            }
                        }
                    }
                });

            $imp->update(['total_categorias' => $totalCategorias]);

            if (empty($jobs)) {
                $imp->update(['status' => EstoqueImportacao::STATUS_SUCCESS, 'finished_at' => now()]);
                return;
            }

            $impId = $this->importacaoId;
            Bus::batch($jobs)
                ->name("estoque-import-{$impId}")
                ->onQueue($fila)
                ->allowFailures()
                ->finally(function (Batch $batch) use ($impId) {
                    $imp = EstoqueImportacao::find($impId);
                    if (!$imp || $imp->isFinal()) {
                        return;
                    }
                    $imp->update([
                        'status'      => $imp->total_falhas > 0
                            ? EstoqueImportacao::STATUS_PARTIAL
                            : EstoqueImportacao::STATUS_SUCCESS,
                        'finished_at' => now(),
                    ]);
                })
                ->dispatch();
        } catch (Throwable $e) {
            $imp->update([
                'status'      => EstoqueImportacao::STATUS_FAILED,
                'finished_at' => now(),
                'erro_global' => $e->getMessage(),
            ]);
            Log::error("Importacao estoque #{$imp->id} ABORTOU: {$e->getMessage()}");
            throw $e;
        }
    }

    /**
     * Cria/atualiza uma categoria espelhada (idempotente por legacy_kind+legacy_id).
     */
    private function upsertCategoria(string $kind, string $leroyId, string $nome, ?int $parentId): Categoria
    {
        return Categoria::updateOrCreate(
            ['legacy_kind' => $kind, 'legacy_id' => $leroyId],
            [
                'company_id' => null,                 // catálogo global
                'parent_id'  => $parentId,
                'nome'       => $nome,
                'slug'       => Str::slug("leroy {$kind} {$leroyId}"),
                'ativo'      => true,
                'user_create' => 'importacao@leroy',
            ]
        );
    }

    public function failed(Throwable $e): void
    {
        $imp = EstoqueImportacao::find($this->importacaoId);
        if ($imp && !$imp->isFinal()) {
            $imp->update([
                'status'      => EstoqueImportacao::STATUS_FAILED,
                'finished_at' => now(),
                'erro_global' => 'Job pai falhou: ' . $e->getMessage(),
            ]);
        }
    }
}
