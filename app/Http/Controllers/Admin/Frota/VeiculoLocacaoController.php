<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Funcionario;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoLocacao;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoLocacaoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoLocacao::query()
            ->with(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'funcionario:id,nome', 'funcionarioDestino:id,nome']);

        if ($obra = $request->input('obra_id'))     $query->where('id_obra', $obra);
        if ($status = $request->input('status')) {
            if ($status === 'ativas')   $query->whereNull('data_fim');
            if ($status === 'fechadas') $query->whereNotNull('data_fim');
        }

        $locacoes = $query->orderByDesc('id')->paginate(20)->withQueryString();

        return Inertia::render('Admin/Frota/Locacoes/Index', [
            'locacoes' => $locacoes,
            'obras'    => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'filtros'  => ['obra_id' => $obra ?? '', 'status' => $status ?? ''],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Locacoes/Form', [
            'locacao'      => null,
            'veiculos'     => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'obras'        => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'funcionarios' => Funcionario::orderBy('nome')->get(['id', 'nome']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        VeiculoLocacao::create($this->validar($request));
        return redirect()->route('admin.frota.locacoes.index')->with('success', 'Locação criada.');
    }

    public function edit(VeiculoLocacao $locacao): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Locacoes/Form', [
            'locacao'      => $locacao,
            'veiculos'     => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'obras'        => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'funcionarios' => Funcionario::orderBy('nome')->get(['id', 'nome']),
        ]);
    }

    public function update(Request $request, VeiculoLocacao $locacao): RedirectResponse
    {
        $locacao->update($this->validar($request));
        return redirect()->route('admin.frota.locacoes.index')->with('success', 'Locação atualizada.');
    }

    public function destroy(VeiculoLocacao $locacao): RedirectResponse
    {
        $locacao->delete();
        return redirect()->route('admin.frota.locacoes.index')->with('success', 'Locação removida.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'id_obra'                => 'nullable|exists:obras,id',
            'veiculo_id'             => 'required|exists:veiculos,id',
            'id_obraDestino'         => 'nullable|exists:obras,id',
            'id_funcionario'         => 'nullable|exists:funcionarios,id',
            'id_funcionario_destino' => 'nullable|exists:funcionarios,id',
            'tipo_veiculo'           => 'nullable|string|max:30',
            'data_inicio'            => 'nullable|date',
            'data_prevista'          => 'nullable|date',
            'data_fim'               => 'nullable|date',
        ]);
    }
}
