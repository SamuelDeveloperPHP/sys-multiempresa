<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Http\Controllers\Controller;
use App\Jobs\Estoque\ImportarLeroyParaEstoqueJob;
use App\Models\Estoque\EstoqueImportacao;
use App\Models\Estoque\LeroyMerlin\LeroyProduto;
use App\Models\Estoque\Produto;
use App\Services\LeroyMerlin\BackgroundWorkerLauncher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Painel da PONTE: importa o catálogo Leroy (referência) → estoque_produtos
 * (operacional, global). Tela com barra de % + progresso por categoria (polling).
 *
 * Operação pesada → restrita a super_admin/manager.
 */
class ImportacaoEstoqueController extends Controller
{
    private const TIPOS_AUTORIZADOS = ['super_admin', 'manager'];

    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Estoque/ImportacaoEstoque/Index', [
            'importacaoAtiva' => $this->serialize($this->runAtivo()),
            'ultima'          => $this->serialize(EstoqueImportacao::latest('id')->first()),
            'historico'       => EstoqueImportacao::with('user:id,name')
                ->latest('id')->limit(10)->get()
                ->map(fn ($r) => $this->serialize($r)),
            'totais'          => $this->totais(),
            'podeIniciar'     => in_array($request->user()->type, self::TIPOS_AUTORIZADOS, true),
        ]);
    }

    public function iniciar(Request $request, BackgroundWorkerLauncher $launcher)
    {
        abort_unless(
            in_array($request->user()->type, self::TIPOS_AUTORIZADOS, true),
            403,
            'Apenas super-admin ou manager pode importar.'
        );

        if ($this->runAtivo()) {
            return back()->with('error', 'Já existe uma importação em andamento.');
        }
        if (LeroyProduto::count() === 0) {
            return back()->with('error', 'Catálogo Leroy vazio. Rode a sincronização Leroy primeiro.');
        }

        $imp = EstoqueImportacao::create([
            'user_id'   => $request->user()->id,
            'status'    => EstoqueImportacao::STATUS_QUEUED,
            'queued_at' => now(),
        ]);

        $fila = config('leroy.queue_import', 'estoque-import');
        ImportarLeroyParaEstoqueJob::dispatch($imp->id)->onQueue($fila);

        $workers = 0;
        if (config('leroy.auto_spawn_workers', true)) {
            $workers = $launcher->spawn(
                (int) config('leroy.workers', 2),
                $fila,
                (int) config('leroy.worker_timeout', 1800),
                (int) config('leroy.worker_tries', 2),
                (int) config('leroy.worker_memory', 1024),
            );
        }

        $msg = $workers > 0
            ? "Importação iniciada — {$workers} worker(s) processando em segundo plano."
            : "Importação enfileirada na fila \"{$fila}\". Garanta um worker/cron ativo nessa fila.";

        return back()->with('success', $msg);
    }

    public function status(): JsonResponse
    {
        $run = $this->runAtivo() ?? EstoqueImportacao::latest('id')->first();

        return response()->json([
            'run'    => $this->serialize($run),
            'totais' => $this->totais(),
        ]);
    }

    /* ---------------------------------------------------------------------- */

    private function runAtivo(): ?EstoqueImportacao
    {
        return EstoqueImportacao::whereIn('status', [EstoqueImportacao::STATUS_QUEUED, EstoqueImportacao::STATUS_RUNNING])
            ->latest('id')->first();
    }

    private function totais(): array
    {
        return [
            'leroy_disponiveis'   => LeroyProduto::count(),
            'produtos_estoque'    => Produto::count(),
            'produtos_do_leroy'   => Produto::where('origem', Produto::ORIGEM_LEROY)->count(),
        ];
    }

    private function serialize(?EstoqueImportacao $r): ?array
    {
        if (!$r) return null;

        return [
            'id'          => $r->id,
            'status'      => $r->status,
            'percentual'  => $r->percentual,
            'usuario'     => $r->user?->name,
            'queued_at'   => $r->queued_at?->toIso8601String(),
            'started_at'  => $r->started_at?->toIso8601String(),
            'finished_at' => $r->finished_at?->toIso8601String(),
            'is_ativo'    => $r->isAtivo(),
            'totais'      => [
                'previsto'    => $r->total_produtos_previsto,
                'importados'  => $r->total_produtos_importados,
                'categorias'  => $r->total_categorias,
                'imagens'     => $r->total_imagens,
                'falhas'      => $r->total_falhas,
            ],
            // últimas 12 categorias processadas (live feed)
            'feed'        => array_slice($r->progresso_categorias ?? [], -12),
            'erro_global' => $r->erro_global,
        ];
    }
}
