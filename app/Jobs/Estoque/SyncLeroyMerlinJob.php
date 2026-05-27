<?php

namespace App\Jobs\Estoque;

use App\Models\Estoque\LeroyMerlin\LeroyCategoriaPrimaria;
use App\Models\Estoque\LeroyMerlin\LeroyCategoriaPrincipal;
use App\Models\Estoque\LeroyMerlin\LeroyCategoriaSecundaria;
use App\Models\Estoque\LeroyMerlin\LeroySyncRun;
use App\Services\LeroyMerlin\LeroyMerlinScraper;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Job PAI/orquestrador da sincronização Leroy Merlin.
 *
 * 1. Marca o LeroySyncRun como RUNNING.
 * 2. Caminha a árvore de categorias (principais → primárias → secundárias),
 *    persistindo-as.
 * 3. Despacha um Bus::batch com 1 job FILHO por categoria-folha
 *    (SyncLeroyCategoriaProdutosJob) → vários workers processam em PARALELO.
 * 4. O callback finally() do batch marca o run como success/partial quando
 *    TODOS os filhos terminam.
 *
 * Roda na fila 'leroy'. ShouldBeUnique impede 2 sincronizações simultâneas.
 */
class SyncLeroyMerlinJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600; // 1h só pra montar a árvore (produtos vão nos filhos)
    public int $tries = 1;
    public int $maxExceptions = 1;

    public function __construct(public int $syncRunId)
    {
    }

    public function uniqueId(): string
    {
        return 'leroy-merlin-sync';
    }

    public function uniqueFor(): int
    {
        return 3600;
    }

    public function handle(LeroyMerlinScraper $scraper): void
    {
        @ini_set('memory_limit', '1024M');

        $run = LeroySyncRun::find($this->syncRunId);
        if (!$run) {
            Log::error("SyncLeroyMerlinJob: run #{$this->syncRunId} não encontrado.");
            return;
        }

        $run->update(['status' => LeroySyncRun::STATUS_RUNNING, 'started_at' => now()]);
        $userId = $run->user_id;

        try {
            $jobs = [];
            $cPrinc = $cPrim = $cSec = 0;

            foreach ($scraper->fetchCategoryTree() as $pd) {
                $principal = LeroyCategoriaPrincipal::updateOrCreate(
                    ['leroy_id' => $pd['leroy_id']],
                    ['nome' => $pd['nome']]
                );
                $cPrinc++;

                foreach ($scraper->fetchPrimariasOf($principal->leroy_id) as $prd) {
                    $primaria = LeroyCategoriaPrimaria::updateOrCreate(
                        ['leroy_id' => $prd['leroy_id']],
                        [
                            'categoria_principal_id' => $principal->id,
                            'leroy_principal_id'     => $principal->leroy_id,
                            'nome'                   => $prd['nome'],
                        ]
                    );
                    $cPrim++;

                    foreach ($scraper->fetchSecundariasOf($primaria->leroy_id) as $sd) {
                        $secundaria = LeroyCategoriaSecundaria::updateOrCreate(
                            ['leroy_id' => $sd['leroy_id']],
                            [
                                'categoria_principal_id' => $principal->id,
                                'categoria_primaria_id'  => $primaria->id,
                                'leroy_principal_id'     => $principal->leroy_id,
                                'leroy_primaria_id'      => $primaria->leroy_id,
                                'nome'                   => $sd['nome'],
                            ]
                        );
                        $cSec++;

                        $jobs[] = new SyncLeroyCategoriaProdutosJob($this->syncRunId, [
                            'leroy_id_secundaria' => $secundaria->leroy_id,
                            'principal_id'        => $principal->id,
                            'primaria_id'         => $primaria->id,
                            'secundaria_id'       => $secundaria->id,
                            'user_id'             => $userId,
                        ]);
                    }
                }
            }

            $run->update([
                'total_categorias_principais'  => $cPrinc,
                'total_categorias_primarias'   => $cPrim,
                'total_categorias_secundarias' => $cSec,
            ]);

            // Sem categorias-folha → nada a processar.
            if (empty($jobs)) {
                $run->update(['status' => LeroySyncRun::STATUS_SUCCESS, 'finished_at' => now()]);
                return;
            }

            $runId = $this->syncRunId;
            $fila  = config('leroy.queue', 'leroy');

            Bus::batch($jobs)
                ->name("leroy-sync-{$runId}")
                ->onQueue($fila)
                ->allowFailures()
                ->finally(function (Batch $batch) use ($runId) {
                    $run = LeroySyncRun::find($runId);
                    if (!$run || $run->isFinal()) {
                        return;
                    }
                    $run->update([
                        'status'      => $run->total_falhas > 0
                            ? LeroySyncRun::STATUS_PARTIAL
                            : LeroySyncRun::STATUS_SUCCESS,
                        'finished_at' => now(),
                    ]);
                })
                ->dispatch();
        } catch (Throwable $e) {
            $run->update([
                'status'      => LeroySyncRun::STATUS_FAILED,
                'finished_at' => now(),
                'erro_global' => $e->getMessage(),
            ]);
            Log::error("Sincronização Leroy #{$run->id} ABORTOU na árvore: {$e->getMessage()}");
            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        $run = LeroySyncRun::find($this->syncRunId);
        if ($run && !$run->isFinal()) {
            $run->update([
                'status'      => LeroySyncRun::STATUS_FAILED,
                'finished_at' => now(),
                'erro_global' => 'Job pai falhou: ' . $exception->getMessage(),
            ]);
        }
    }
}
