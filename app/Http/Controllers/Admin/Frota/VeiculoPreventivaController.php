<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoPreventiva;
use App\Models\Frota\VeiculoPreventivaItemRealizada;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoPreventivaController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoPreventiva::query()
            ->with('veiculo:id,prefixo,placa')
            ->withCount('itensRealizados');
        if ($v = $request->input('veiculo_id'))   $query->where('id_veiculo', $v);
        if ($q = $request->string('q')->value())   $query->where('nome_preventiva', 'like', "%{$q}%");

        return Inertia::render('Admin/Frota/Preventivas/Index', [
            'preventivas' => $query->orderBy('nome_preventiva')->paginate(20)->withQueryString(),
            'veiculos'    => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'filtros'     => $request->only(['veiculo_id', 'q']),
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Preventivas/Form', [
            'preventiva' => null,
            'veiculos'   => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        VeiculoPreventiva::create($this->validar($request));
        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva cadastrada.');
    }

    public function show(VeiculoPreventiva $preventiva): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Preventivas/Show', [
            'preventiva' => $preventiva->load('veiculo:id,prefixo,placa'),
            'historico'  => VeiculoPreventivaItemRealizada::where('id_preventiva', $preventiva->id)
                ->orderByDesc('data_de_execucao')->get(),
        ]);
    }

    public function edit(VeiculoPreventiva $preventiva): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Preventivas/Form', [
            'preventiva' => $preventiva,
            'veiculos'   => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
        ]);
    }

    public function update(Request $request, VeiculoPreventiva $preventiva): RedirectResponse
    {
        $preventiva->update($this->validar($request));
        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva atualizada.');
    }

    public function destroy(VeiculoPreventiva $preventiva): RedirectResponse
    {
        $preventiva->delete();
        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva removida.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'id_veiculo'     => 'nullable|exists:veiculos,id',
            'nome_preventiva'=> 'required|string|max:191',
            'nome_servico'   => 'nullable|string|max:191',
            'tipo_veiculo'   => 'nullable|string|max:30',
            'situacao'       => 'nullable|string|max:30',
            'periodo'        => 'nullable|integer|min:0',
            'tipo'           => 'nullable|string|max:30',
            'alerta_venci'   => 'nullable|integer|min:0',
        ]);
    }
}
