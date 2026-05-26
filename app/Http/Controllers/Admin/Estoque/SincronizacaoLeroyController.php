<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Http\Controllers\Controller;
use App\Jobs\Estoque\SyncLeroyMerlinJob;
use App\Models\Estoque\LeroyMerlin\LeroyProduto;
use App\Models\Estoque\LeroyMerlin\LeroySyncRun;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Painel de sincronização do catálogo Leroy Merlin.
 *
 * - index()   : tela Inertia com status atual, totais e histórico de runs.
 * - iniciar() : enfileira um SyncLeroyMerlinJob (1 por vez — ShouldBeUnique).
 * - status()  : JSON pro front fazer polling do progresso.
 *
 * Operação pesada (scraping externo) — restrita a super_admin/manager.
 * O middleware module.access já gateia o acesso ao módulo; aqui reforçamos
 * pra disparo do job.
 */
class SincronizacaoLeroyController extends Controller
{
    private const TIPOS_AUTORIZADOS = ['super_admin', 'manager'];

    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Estoque/SincronizacaoLeroy/Index', [
            'runAtivo'   => $this->serializeRun($this->runAtivo()),
            'ultimoRun'  => $this->serializeRun(LeroySyncRun::latest('id')->first()),
            'historico'  => LeroySyncRun::with('user:id,name')
                ->latest('id')->limit(10)->get()
                ->map(fn ($r) => $this->serializeRun($r)),
            'totais'     => $this->totais(),
            'podeIniciar' => in_array($request->user()->type, self::TIPOS_AUTORIZADOS, true),
        ]);
    }

    public function iniciar(Request $request)
    {
        abort_unless(
            in_array($request->user()->type, self::TIPOS_AUTORIZADOS, true),
            403,
            'Apenas super-admin ou manager pode iniciar a sincronização.'
        );

        if ($this->runAtivo()) {
            return back()->with('error', 'Já existe uma sincronização em andamento.');
        }

        $run = LeroySyncRun::create([
            'user_id'  => $request->user()->id,
            'status'   => LeroySyncRun::STATUS_QUEUED,
            'queued_at' => now(),
        ]);

        SyncLeroyMerlinJob::dispatch($run->id);

        return back()->with('success', 'Sincronização enfileirada. Acompanhe o progresso abaixo.');
    }

    public function status(): JsonResponse
    {
        $run = $this->runAtivo() ?? LeroySyncRun::latest('id')->first();

        return response()->json([
            'run'    => $this->serializeRun($run),
            'totais' => $this->totais(),
        ]);
    }

    /* ---------------------------------------------------------------------- */

    private function runAtivo(): ?LeroySyncRun
    {
        return LeroySyncRun::whereIn('status', [LeroySyncRun::STATUS_QUEUED, LeroySyncRun::STATUS_RUNNING])
            ->latest('id')
            ->first();
    }

    private function totais(): array
    {
        return [
            'produtos' => LeroyProduto::count(),
        ];
    }

    private function serializeRun(?LeroySyncRun $run): ?array
    {
        if (!$run) return null;

        return [
            'id'         => $run->id,
            'status'     => $run->status,
            'usuario'    => $run->user?->name,
            'queued_at'  => $run->queued_at?->toIso8601String(),
            'started_at' => $run->started_at?->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'is_ativo'   => $run->isAtivo(),
            'totais'     => [
                'principais'  => $run->total_categorias_principais,
                'primarias'   => $run->total_categorias_primarias,
                'secundarias' => $run->total_categorias_secundarias,
                'produtos'    => $run->total_produtos,
                'falhas'      => $run->total_falhas,
            ],
            'erro_global' => $run->erro_global,
        ];
    }
}
