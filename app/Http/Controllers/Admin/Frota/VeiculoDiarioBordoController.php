<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoDiarioBordo;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Diario de bordo eh majoritariamente CRIADO pelo mobile. Aqui apenas:
 *   - Lista todos os registros (audit)
 *   - Mostra detalhes (show)
 *   - Permite editar observacoes/encerramento (raramente usado)
 *   - Exclusao (admin) — soft delete
 */
class VeiculoDiarioBordoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoDiarioBordo::query()
            ->with(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'user:id,name']);

        if ($v = $request->input('veiculo_id'))  $query->where('id_veiculo', $v);
        if ($o = $request->input('id_obra'))     $query->where('id_obra', $o);
        if ($s = $request->input('ciclo_status'))$query->where('ciclo_status', $s);

        return Inertia::render('Admin/Frota/Diario/Index', [
            'diarios' => $query->orderByDesc('horario_inicial')->paginate(20)->withQueryString(),
            'veiculos'=> Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'obras'   => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'filtros' => $request->only(['veiculo_id', 'id_obra', 'ciclo_status']),
        ]);
    }

    public function show(VeiculoDiarioBordo $diario): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Diario/Show', [
            'diario' => $diario->load(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'user:id,name,email']),
        ]);
    }

    public function update(Request $request, VeiculoDiarioBordo $diario): RedirectResponse
    {
        $data = $request->validate([
            'descricao_atividade'    => 'nullable|string',
            'descricao_encerramento' => 'nullable|string',
            'ciclo_status'           => 'nullable|in:ABERTO,ENCERRADO',
        ]);
        $diario->update($data);
        return redirect()->route('admin.frota.diario.show', $diario->id)->with('success', 'Diário atualizado.');
    }

    public function destroy(VeiculoDiarioBordo $diario): RedirectResponse
    {
        $diario->delete();
        return redirect()->route('admin.frota.diario.index')->with('success', 'Diário removido.');
    }
}
