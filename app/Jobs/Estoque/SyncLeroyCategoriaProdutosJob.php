<?php

namespace App\Jobs\Estoque;

use App\Models\Estoque\LeroyMerlin\LeroyProduto;
use App\Services\LeroyMerlin\LeroyMerlinScraper;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Job FILHO: sincroniza os produtos de UMA categoria-folha (secundária) da
 * Leroy Merlin. Despachado em lote (Bus::batch) pelo SyncLeroyMerlinJob — assim
 * vários workers processam categorias em PARALELO.
 *
 * Contadores do run são incrementados de forma atômica (DB increment) porque
 * múltiplos filhos rodam ao mesmo tempo.
 */
class SyncLeroyCategoriaProdutosJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1800; // 30 min por categoria
    public int $tries = 2;

    /**
     * @param array{leroy_id_secundaria:string,principal_id:int,primaria_id:int,secundaria_id:int,user_id:?int} $contexto
     */
    public function __construct(public int $syncRunId, public array $contexto)
    {
    }

    public function handle(LeroyMerlinScraper $scraper): void
    {
        // Se o lote foi cancelado (ex.: operador abortou), não faz nada.
        if ($this->batch()?->cancelled()) {
            return;
        }

        @ini_set('memory_limit', '1024M');

        try {
            $produtos = $scraper->fetchProductsOf($this->contexto['leroy_id_secundaria']);
        } catch (\Throwable $e) {
            $this->incrementar('total_falhas', 1);
            Log::warning("Leroy: falha ao buscar produtos da categoria {$this->contexto['leroy_id_secundaria']}: {$e->getMessage()}");
            return;
        }

        $gravados = 0;
        foreach ($produtos as $p) {
            try {
                $imagemPath = $scraper->downloadImage($p['imagem_url'] ?? null, "leroy_merlin/{$p['leroy_id']}");

                LeroyProduto::updateOrCreate(
                    ['leroy_id' => $p['leroy_id']],
                    [
                        'categoria_principal_id'  => $this->contexto['principal_id'],
                        'categoria_primaria_id'   => $this->contexto['primaria_id'],
                        'categoria_secundaria_id' => $this->contexto['secundaria_id'],
                        'nome'                    => $p['nome'],
                        'marca'                   => $p['marca'] ?? null,
                        'valor_unitario'          => $p['valor'] ?? 0,
                        'unidade'                 => $p['unidade'] ?? 'UN',
                        'imagem_path'             => $imagemPath,
                        'imagem_url_original'     => $p['imagem_url'] ?? null,
                        'ativo'                   => true,
                        'ultimo_sync_user_id'     => $this->contexto['user_id'] ?? null,
                        'ultimo_sync_at'          => Carbon::now(),
                    ]
                );
                $gravados++;
            } catch (\Throwable $e) {
                $this->incrementar('total_falhas', 1);
                Log::warning("Leroy: falha ao gravar produto {$p['leroy_id']}: {$e->getMessage()}");
            }
        }

        if ($gravados > 0) {
            $this->incrementar('total_produtos', $gravados);
        }

        gc_collect_cycles();
    }

    public function failed(\Throwable $e): void
    {
        $this->incrementar('total_falhas', 1);
        Log::error("Leroy: job da categoria {$this->contexto['leroy_id_secundaria']} falhou: {$e->getMessage()}");
    }

    private function incrementar(string $coluna, int $qtd): void
    {
        DB::table('estoque_leroy_sync_runs')->where('id', $this->syncRunId)->increment($coluna, $qtd);
    }
}
