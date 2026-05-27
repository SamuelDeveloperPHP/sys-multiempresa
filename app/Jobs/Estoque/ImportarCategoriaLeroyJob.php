<?php

namespace App\Jobs\Estoque;

use App\Models\Estoque\EstoqueImportacao;
use App\Models\Estoque\LeroyMerlin\LeroyCategoriaSecundaria;
use App\Models\Estoque\LeroyMerlin\LeroyProduto;
use App\Models\Estoque\Produto;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PONTE — Job FILHO: importa os produtos de UMA categoria-folha Leroy para
 * estoque_produtos (global). Roda em paralelo (Bus::batch).
 *
 * - SKU = "LM-{leroy_id}" → único global, reimport idempotente (updateOrCreate).
 * - valor_referencia = preço Leroy (somente consulta); valor_unitario espelha
 *   pra exibição, mas o front trava o campo (origem=leroy_merlin).
 * - Imagem reaproveitada do storage (já baixada na sincronização Leroy).
 */
class ImportarCategoriaLeroyJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1800;
    public int $tries = 2;

    public function __construct(
        public int $importacaoId,
        public int $leroySecundariaId,
        public int $estoqueCategoriaId
    ) {
    }

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }
        @ini_set('memory_limit', '1024M');

        $secundaria = LeroyCategoriaSecundaria::find($this->leroySecundariaId);
        $nomeCategoria = $secundaria?->nome ?? "Categoria #{$this->leroySecundariaId}";

        $importados = 0;
        $comImagem = 0;
        $falhas = 0;

        LeroyProduto::where('categoria_secundaria_id', $this->leroySecundariaId)
            ->chunkById(200, function ($produtos) use (&$importados, &$comImagem, &$falhas) {
                foreach ($produtos as $lp) {
                    try {
                        Produto::updateOrCreate(
                            ['sku' => 'LM-' . $lp->leroy_id],
                            [
                                'company_id'       => null,                 // global
                                'categoria_id'     => $this->estoqueCategoriaId,
                                'nome'             => $lp->nome,
                                'marca'            => $lp->marca,
                                'unidade'          => $lp->unidade ?: 'UN',
                                'valor_referencia' => $lp->valor_unitario,  // só referência
                                'valor_unitario'   => $lp->valor_unitario,  // espelho (campo travado no front)
                                'imagem'           => $lp->imagem_path,
                                'ativo'            => true,
                                'origem'           => Produto::ORIGEM_LEROY,
                                'chave_pdm'        => $lp->chave_pdm,
                                'leroy_id_ref'     => $lp->leroy_id,
                                'user_create'      => 'importacao@leroy',
                            ]
                        );
                        $importados++;
                        if ($lp->imagem_path) {
                            $comImagem++;
                        }
                    } catch (\Throwable $e) {
                        $falhas++;
                        Log::warning("Import estoque: falha no produto leroy {$lp->leroy_id}: {$e->getMessage()}");
                    }
                }
            });

        $this->registrarProgresso($nomeCategoria, $importados, $comImagem, $falhas);
        gc_collect_cycles();
    }

    /**
     * Uma escrita travada por categoria (não por produto) — race-free entre
     * workers paralelos e barata (poucas centenas de categorias no total).
     */
    private function registrarProgresso(string $nomeCategoria, int $importados, int $comImagem, int $falhas): void
    {
        DB::transaction(function () use ($nomeCategoria, $importados, $comImagem, $falhas) {
            /** @var EstoqueImportacao|null $imp */
            $imp = EstoqueImportacao::lockForUpdate()->find($this->importacaoId);
            if (!$imp) {
                return;
            }

            $feed = $imp->progresso_categorias ?? [];
            $feed[] = [
                'categoria'  => $nomeCategoria,
                'importados' => $importados,
                'falhas'     => $falhas,
                'em'         => now()->toIso8601String(),
            ];
            // mantém só as últimas 100 entradas (live feed)
            if (count($feed) > 100) {
                $feed = array_slice($feed, -100);
            }

            $imp->update([
                'total_produtos_importados' => $imp->total_produtos_importados + $importados,
                'total_imagens'             => $imp->total_imagens + $comImagem,
                'total_falhas'              => $imp->total_falhas + $falhas,
                'progresso_categorias'      => $feed,
            ]);
        });
    }

    public function failed(\Throwable $e): void
    {
        DB::table('estoque_importacoes')->where('id', $this->importacaoId)->increment('total_falhas');
        Log::error("ImportarCategoriaLeroyJob: categoria {$this->leroySecundariaId} falhou: {$e->getMessage()}");
    }
}
