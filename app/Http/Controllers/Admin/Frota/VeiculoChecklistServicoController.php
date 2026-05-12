<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoChecklistRealizado;
use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Obra;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Auditoria das EXECUCOES de checklist do mobile (aberturas, fechamentos, itens).
 * Estes dados sao criados pelo app — admin apenas consulta e anula em casos
 * excepcionais (soft delete).
 */
class VeiculoChecklistServicoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoChecklistServico::query()
            ->with(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'checklist:id,nome_checklist'])
            ->withCount('itensRealizados');

        if ($v = $request->input('veiculo_id'))    $query->where('id_veiculo', $v);
        if ($o = $request->input('id_obra'))       $query->where('id_obra', $o);
        if ($s = $request->input('status_ciclo'))  $query->where('status_ciclo', $s);
        if ($t = $request->input('tipo_checklist'))$query->where('tipo_checklist', $t);

        return Inertia::render('Admin/Frota/ChecklistExecucoes/Index', [
            'execucoes' => $query->orderByDesc('data_cadastro')->paginate(20)->withQueryString(),
            'veiculos'  => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'obras'     => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'filtros'   => $request->only(['veiculo_id', 'id_obra', 'status_ciclo', 'tipo_checklist']),
        ]);
    }

    public function show(VeiculoChecklistServico $execucao): InertiaResponse
    {
        $itens = VeiculoChecklistRealizado::where('id_checklist_realizado', $execucao->id_local)
            ->with('item:id,nome_servico')
            ->orderBy('id')
            ->get();

        return Inertia::render('Admin/Frota/ChecklistExecucoes/Show', [
            'execucao' => $execucao->load(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'checklist:id,nome_checklist']),
            'itens'    => $itens,
        ]);
    }

    public function destroy(VeiculoChecklistServico $execucao): \Illuminate\Http\RedirectResponse
    {
        $execucao->delete();
        return redirect()->route('admin.frota.checklist-execucoes.index')->with('success', 'Execução removida.');
    }
}
