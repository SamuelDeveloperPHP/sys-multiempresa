<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Funcionario;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoAbastecimentoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoAbastecimento::query()
            ->with(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia']);

        if ($veiculo = $request->input('veiculo_id')) $query->where('veiculo_id', $veiculo);
        if ($obra = $request->input('id_obra'))       $query->where('id_obra', $obra);
        if ($dataIni = $request->input('data_ini'))   $query->whereDate('data_abastecimento', '>=', $dataIni);
        if ($dataFim = $request->input('data_fim'))   $query->whereDate('data_abastecimento', '<=', $dataFim);

        $abastecimentos = $query->orderByDesc('data_abastecimento')
            ->paginate(20)->withQueryString();

        // KPIs do filtro corrente
        $kpiQuery = (clone $query);
        $totais = [
            'quantidade'  => (float) $kpiQuery->sum('quantidade'),
            'valor_total' => (float) $kpiQuery->sum('valor_total'),
            'registros'   => (int)   $kpiQuery->count(),
        ];

        return Inertia::render('Admin/Frota/Abastecimentos/Index', [
            'abastecimentos' => $abastecimentos,
            'veiculos'       => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'obras'          => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'totais'         => $totais,
            'filtros'        => $request->only(['veiculo_id', 'id_obra', 'data_ini', 'data_fim']),
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Abastecimentos/Form', [
            'abastecimento' => null,
            'veiculos'      => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'tipo_hr', 'tipo_km']),
            'obras'         => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'funcionarios'  => Funcionario::orderBy('nome')->get(['id', 'nome']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validar($request);
        $data['id_local'] = $data['id_local'] ?? (string) Str::uuid();
        VeiculoAbastecimento::create($data);
        return redirect()->route('admin.frota.abastecimentos.index')->with('success', 'Abastecimento registrado.');
    }

    public function edit(VeiculoAbastecimento $abastecimento): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Abastecimentos/Form', [
            'abastecimento' => $abastecimento,
            'veiculos'      => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'tipo_hr', 'tipo_km']),
            'obras'         => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'funcionarios'  => Funcionario::orderBy('nome')->get(['id', 'nome']),
        ]);
    }

    public function update(Request $request, VeiculoAbastecimento $abastecimento): RedirectResponse
    {
        $abastecimento->update($this->validar($request));
        return redirect()->route('admin.frota.abastecimentos.index')->with('success', 'Abastecimento atualizado.');
    }

    public function destroy(VeiculoAbastecimento $abastecimento): RedirectResponse
    {
        $abastecimento->delete();
        return redirect()->route('admin.frota.abastecimentos.index')->with('success', 'Abastecimento removido.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'veiculo_id'         => 'required|exists:veiculos,id',
            'id_obra'            => 'nullable|exists:obras,id',
            'id_funcionario'     => 'nullable|exists:funcionarios,id',
            'data_abastecimento' => 'required|date',
            'km_anterior'        => 'nullable|integer|min:0',
            'km_atual'           => 'nullable|integer|min:0',
            'hr_anterior'        => 'nullable|integer|min:0',
            'hr_atual'           => 'nullable|integer|min:0',
            'fornecedor'         => 'nullable|string|max:191',
            'combustivel'        => 'nullable|string|max:60',
            'tipo'               => 'nullable|string|max:30',
            'quantidade'         => 'required|numeric|min:0',
            'valor_do_litro'     => 'required|numeric|min:0',
            'valor_total'        => 'required|numeric|min:0',
            'arquivo_app'        => 'nullable|string|max:255',
        ]);
    }
}
