<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\VeiculoChecklist;
use App\Models\Frota\VeiculoChecklistItem;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * CRUD dos itens (perguntas) de um modelo de checklist.
 * Rotas aninhadas: /admin/frota/checklists/{checklist}/itens
 */
class VeiculoChecklistItemController extends Controller
{
    public function index(VeiculoChecklist $checklist): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Checklists/Itens', [
            'checklist' => $checklist,
            'itens'     => $checklist->itens()->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request, VeiculoChecklist $checklist): RedirectResponse
    {
        $data = $this->validar($request);
        $data['id_checklist'] = $checklist->id;
        $data['id_veiculo']   = $checklist->id_veiculo;
        VeiculoChecklistItem::create($data);
        return back()->with('success', 'Item adicionado.');
    }

    public function update(Request $request, VeiculoChecklist $checklist, VeiculoChecklistItem $item): RedirectResponse
    {
        abort_unless($item->id_checklist === $checklist->id, 404);
        $item->update($this->validar($request));
        return back()->with('success', 'Item atualizado.');
    }

    public function destroy(VeiculoChecklist $checklist, VeiculoChecklistItem $item): RedirectResponse
    {
        abort_unless($item->id_checklist === $checklist->id, 404);
        $item->delete();
        return back()->with('success', 'Item removido.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'nome_servico'    => 'required|string|max:191',
            'tipo_itens'      => 'nullable|string|max:30',
            'periodo_maq_vei' => 'nullable|integer',
            'periodo_dias'    => 'nullable|integer',
            'alerta_venci'    => 'nullable|integer',
            'alert_venc_dias' => 'nullable|integer',
            'situacao'        => 'nullable|string|max:30',
        ]);
    }
}
