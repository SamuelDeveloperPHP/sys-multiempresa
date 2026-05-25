<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

/**
 * PagesController — renderiza apenas o "casco" Inertia das páginas mobile.
 * Os dados são puxados pelos repositories no client via /api/mobile/*.
 *
 * Isso garante que após o primeiro carregamento as páginas funcionem 100%
 * offline (servidas do cache PWA + cache local IndexedDB).
 */
class PagesController extends Controller
{
    // ===== Dashboard =====
    public function dashboardMobile()
    {
        return Inertia::render('Mobile/Dashboard/Index');
    }

    // ===== Veículos =====
    public function veiculosIndex()
    {
        return Inertia::render('Mobile/Veiculos/Index');
    }

    public function veiculosShow($id)
    {
        return Inertia::render('Mobile/Veiculos/Show', ['veiculoId' => $id]);
    }

    // ===== Abastecimentos =====
    public function abastecimentosIndex($veiculoId)
    {
        return Inertia::render('Mobile/Veiculos/Abastecimento/Index', ['veiculoId' => $veiculoId]);
    }
    public function abastecimentosCreate($veiculoId)
    {
        return Inertia::render('Mobile/Veiculos/Abastecimento/Create', ['veiculoId' => $veiculoId]);
    }
    public function abastecimentosShow($veiculoId, $abastecimentoId)
    {
        return Inertia::render('Mobile/Veiculos/Abastecimento/Show', [
            'veiculoId' => $veiculoId,
            'abastecimentoId' => $abastecimentoId,
        ]);
    }
    public function abastecimentosEdit($veiculoId, $abastecimentoId)
    {
        return Inertia::render('Mobile/Veiculos/Abastecimento/Edit', [
            'veiculoId' => $veiculoId,
            'abastecimentoId' => $abastecimentoId,
        ]);
    }

    // ===== Diário de Bordo =====
    public function diarioIndex($veiculoId)
    {
        return Inertia::render('Mobile/Veiculos/DiarioBordo/Index', ['veiculoId' => $veiculoId]);
    }
    public function diarioCreate($veiculoId)
    {
        return Inertia::render('Mobile/Veiculos/DiarioBordo/Create', ['veiculoId' => $veiculoId]);
    }
    public function diarioShow($veiculoId, $diarioId)
    {
        return Inertia::render('Mobile/Veiculos/DiarioBordo/Show', [
            'veiculoId' => $veiculoId,
            'diarioId' => $diarioId,
        ]);
    }
    public function diarioEdit($veiculoId, $diarioId)
    {
        return Inertia::render('Mobile/Veiculos/DiarioBordo/Edit', [
            'veiculoId' => $veiculoId,
            'diarioId' => $diarioId,
        ]);
    }
    public function diarioClose($veiculoId, $diarioId)
    {
        return Inertia::render('Mobile/Veiculos/DiarioBordo/Close', [
            'veiculoId' => $veiculoId,
            'diarioId' => $diarioId,
        ]);
    }

    // ===== Checklist =====
    public function checklistIndex($veiculoId)
    {
        return Inertia::render('Mobile/Veiculos/ChecklistFrota/Index', ['veiculoId' => $veiculoId]);
    }
    public function checklistIniciar($veiculoId, $templateId)
    {
        return Inertia::render('Mobile/Veiculos/ChecklistFrota/Servicos/Create', [
            'veiculoId' => $veiculoId,
            'templateId' => $templateId,
        ]);
    }
    public function checklistServicoShow($veiculoId, $servicoId)
    {
        return Inertia::render('Mobile/Veiculos/ChecklistFrota/Servicos/Show', [
            'veiculoId' => $veiculoId,
            'servicoId' => $servicoId,
        ]);
    }
    public function checklistServicoEdit($veiculoId, $servicoId)
    {
        return Inertia::render('Mobile/Veiculos/ChecklistFrota/Servicos/Edit', [
            'veiculoId' => $veiculoId,
            'servicoId' => $servicoId,
        ]);
    }

    // ===== Locações =====
    public function locacoesIndex($veiculoId)
    {
        return Inertia::render('Mobile/Veiculos/Locacoes/Index', ['veiculoId' => $veiculoId]);
    }

    // ============================================================
    // LISTAS GLOBAIS (drawer/bottom nav — cross-veículo)
    // ============================================================
    public function abastecimentosGlobalIndex()
    {
        return Inertia::render('Mobile/Abastecimentos/Index');
    }

    public function diarioGlobalIndex()
    {
        return Inertia::render('Mobile/DiarioBordo/Index');
    }

    public function checklistsGlobalIndex()
    {
        return Inertia::render('Mobile/Checklists/Index');
    }

    public function locacoesGlobalIndex()
    {
        return Inertia::render('Mobile/Locacoes/Index');
    }
}
