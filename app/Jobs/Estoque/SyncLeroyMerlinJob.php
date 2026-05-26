<?php

namespace App\Jobs\Estoque;

use App\Models\Estoque\LeroyMerlin\LeroyCategoriaPrimaria;
use App\Models\Estoque\LeroyMerlin\LeroyCategoriaPrincipal;
use App\Models\Estoque\LeroyMerlin\LeroyCategoriaSecundaria;
use App\Models\Estoque\LeroyMerlin\LeroyProduto;
use App\Models\Estoque\LeroyMerlin\LeroySyncRun;
use App\Services\LeroyMerlin\LeroyMerlinScraper;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Sincroniza o catálogo da Leroy Merlin: árvore de categorias (3 níveis) +
 * produtos de cada categoria-folha, baixando imagens.
 *
 * Substitui os 3 jobs soltos do WIP antigo (SyncProductsJob +
 * SyncLeroyCategoriesJob + SyncLeroyProductsByCategoryJob) por um fluxo
 * único, observável (LeroySyncRun) e com tratamento de falha parcial.
 *
 * Cada run cria/atualiza um registro em estoque_leroy_sync_runs que o front
 * consulta via polling pra mostrar progresso.
 */
class SyncLeroyMerlinJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 7200;   // 2h
    public int $tries = 1;        // sem retry automático — operador re-dispara
    public int $maxExceptions = 1;

    /** Contadores acumulados durante a execução. */
    private int $countPrincipais = 0;
    private int $countPrimarias = 0;
    private int $countSecundarias = 0;
    private int $countProdutos = 0;
    private array $falhas = [];

    public function __construct(public int $syncRunId)
    {
    }

    /**
     * Garante UMA sincronização por vez (lock de 2h).
     */
    public function uniqueId(): string
    {
        return 'leroy-merlin-sync';
    }

    public function uniqueFor(): int
    {
        return 7200;
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
            $principais = $scraper->fetchCategoryTree();

            foreach ($principais as $principalData) {
                $principal = LeroyCategoriaPrincipal::updateOrCreate(
                    ['leroy_id' => $principalData['leroy_id']],
                    ['nome' => $principalData['nome']]
                );
                $this->countPrincipais++;

                $this->processarPrimarias($scraper, $principal, $userId);
                $this->persistirProgresso($run);
            }

            $statusFinal = empty($this->falhas)
                ? LeroySyncRun::STATUS_SUCCESS
                : LeroySyncRun::STATUS_PARTIAL;

            $run->update([
                'status'      => $statusFinal,
                'finished_at' => now(),
                ...$this->contadores(),
            ]);

            Log::info("Sincronização Leroy #{$run->id} finalizada: {$statusFinal}", $this->contadores());
        } catch (\Throwable $e) {
            $run->update([
                'status'      => LeroySyncRun::STATUS_FAILED,
                'finished_at' => now(),
                'erro_global' => $e->getMessage(),
                ...$this->contadores(),
            ]);
            Log::error("Sincronização Leroy #{$run->id} ABORTOU: {$e->getMessage()}");
            throw $e;
        }
    }

    private function processarPrimarias(LeroyMerlinScraper $scraper, LeroyCategoriaPrincipal $principal, ?int $userId): void
    {
        try {
            $primarias = $scraper->fetchPrimariasOf($principal->leroy_id);
        } catch (\Throwable $e) {
            $this->registrarFalha("primarias de {$principal->leroy_id}", $e);
            return;
        }

        foreach ($primarias as $primariaData) {
            $primaria = LeroyCategoriaPrimaria::updateOrCreate(
                ['leroy_id' => $primariaData['leroy_id']],
                [
                    'categoria_principal_id' => $principal->id,
                    'leroy_principal_id'     => $principal->leroy_id,
                    'nome'                   => $primariaData['nome'],
                ]
            );
            $this->countPrimarias++;

            $this->processarSecundarias($scraper, $principal, $primaria, $userId);
        }
    }

    private function processarSecundarias(LeroyMerlinScraper $scraper, LeroyCategoriaPrincipal $principal, LeroyCategoriaPrimaria $primaria, ?int $userId): void
    {
        try {
            $secundarias = $scraper->fetchSecundariasOf($primaria->leroy_id);
        } catch (\Throwable $e) {
            $this->registrarFalha("secundarias de {$primaria->leroy_id}", $e);
            return;
        }

        foreach ($secundarias as $secundariaData) {
            $secundaria = LeroyCategoriaSecundaria::updateOrCreate(
                ['leroy_id' => $secundariaData['leroy_id']],
                [
                    'categoria_principal_id' => $principal->id,
                    'categoria_primaria_id'  => $primaria->id,
                    'leroy_principal_id'     => $principal->leroy_id,
                    'leroy_primaria_id'      => $primaria->leroy_id,
                    'nome'                   => $secundariaData['nome'],
                ]
            );
            $this->countSecundarias++;

            $this->processarProdutos($scraper, $principal, $primaria, $secundaria, $userId);

            gc_collect_cycles();
        }
    }

    private function processarProdutos(
        LeroyMerlinScraper $scraper,
        LeroyCategoriaPrincipal $principal,
        LeroyCategoriaPrimaria $primaria,
        LeroyCategoriaSecundaria $secundaria,
        ?int $userId
    ): void {
        try {
            $produtos = $scraper->fetchProductsOf($secundaria->leroy_id);
        } catch (\Throwable $e) {
            $this->registrarFalha("produtos da categoria {$secundaria->leroy_id}", $e);
            return;
        }

        foreach ($produtos as $p) {
            $imagemPath = $scraper->downloadImage($p['imagem_url'] ?? null, "leroy_merlin/{$p['leroy_id']}");

            LeroyProduto::updateOrCreate(
                ['leroy_id' => $p['leroy_id']],
                [
                    'categoria_principal_id'  => $principal->id,
                    'categoria_primaria_id'   => $primaria->id,
                    'categoria_secundaria_id' => $secundaria->id,
                    'nome'                    => $p['nome'],
                    'marca'                   => $p['marca'] ?? null,
                    'valor_unitario'          => $p['valor'] ?? 0,
                    'unidade'                 => $p['unidade'] ?? 'UN',
                    'imagem_path'             => $imagemPath,
                    'imagem_url_original'     => $p['imagem_url'] ?? null,
                    'ativo'                   => true,
                    'ultimo_sync_user_id'     => $userId,
                    'ultimo_sync_at'          => Carbon::now(),
                ]
            );
            $this->countProdutos++;
        }
    }

    private function registrarFalha(string $contexto, \Throwable $e): void
    {
        $this->falhas[] = ['contexto' => $contexto, 'motivo' => $e->getMessage()];
        Log::warning("Falha sync Leroy em {$contexto}: {$e->getMessage()}");
    }

    private function persistirProgresso(LeroySyncRun $run): void
    {
        $run->update($this->contadores());
    }

    private function contadores(): array
    {
        return [
            'total_categorias_principais'  => $this->countPrincipais,
            'total_categorias_primarias'   => $this->countPrimarias,
            'total_categorias_secundarias' => $this->countSecundarias,
            'total_produtos'               => $this->countProdutos,
            'total_falhas'                 => count($this->falhas),
            'falhas_detalhes'              => array_slice($this->falhas, 0, 200),
        ];
    }

    /**
     * Se o job falhar fora do try/catch (timeout, OOM), marca o run como failed.
     */
    public function failed(\Throwable $exception): void
    {
        $run = LeroySyncRun::find($this->syncRunId);
        if ($run && !$run->isFinal()) {
            $run->update([
                'status'      => LeroySyncRun::STATUS_FAILED,
                'finished_at' => now(),
                'erro_global' => 'Job falhou: ' . $exception->getMessage(),
            ]);
        }
    }
}
