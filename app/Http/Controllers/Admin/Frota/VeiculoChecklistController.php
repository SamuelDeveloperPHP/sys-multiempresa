<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoChecklist;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Modelos de checklist (catalogo). A EXECUCAO eh feita no mobile e auditada em
 * VeiculoChecklistServicoController.
 */
class VeiculoChecklistController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoChecklist::query()
            ->with('veiculo:id,prefixo,placa')
            ->withCount('itens');

        if ($q = $request->string('q')->trim()->value()) {
            $query->where('nome_checklist', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/Frota/Checklists/Index', [
            'checklists' => $query->orderBy('nome_checklist')->paginate(20)->withQueryString(),
            'filtros'    => ['q' => $q ?? ''],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Checklists/Form', [
            'checklist' => null,
            'veiculos'  => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        VeiculoChecklist::create($this->validar($request));
        return redirect()->route('admin.frota.checklists.index')->with('success', 'Checklist criado.');
    }

    public function edit(VeiculoChecklist $checklist): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Checklists/Form', [
            'checklist' => $checklist->load('itens'),
            'veiculos'  => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
        ]);
    }

    public function update(Request $request, VeiculoChecklist $checklist): RedirectResponse
    {
        $checklist->update($this->validar($request));
        return redirect()->route('admin.frota.checklists.index')->with('success', 'Checklist atualizado.');
    }

    public function destroy(VeiculoChecklist $checklist): RedirectResponse
    {
        $checklist->delete();
        return redirect()->route('admin.frota.checklists.index')->with('success', 'Checklist removido.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'id_veiculo'     => 'nullable|exists:veiculos,id',
            'nome_checklist' => 'required|string|max:191',
            'situacao'       => 'nullable|string|max:30',
            'user_create'    => 'nullable|string|max:191',
            'user_edit'      => 'nullable|string|max:191',
        ]);
    }
}
