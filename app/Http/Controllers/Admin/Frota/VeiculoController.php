<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Controller admin (web) para CRUD de Veiculos. Inertia + React.
 * Template — use como modelo para Abastecimento/DiarioBordo/Checklist/etc.
 *
 * Multi-tenant automatico via Tenantable trait (filtros e atribuicao de company_id).
 */
class VeiculoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = Veiculo::query()->with('obra:id,nome_fantasia,code');

        if ($search = $request->string('q')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('prefixo', 'like', "%{$search}%")
                  ->orWhere('placa',   'like', "%{$search}%")
                  ->orWhere('modelo',  'like', "%{$search}%")
                  ->orWhere('marca',   'like', "%{$search}%");
            });
        }

        $veiculos = $query
            ->orderBy('prefixo')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Frota/Veiculos/Index', [
            'veiculos' => $veiculos,
            'filtros'  => ['q' => $search ?? ''],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Veiculos/Form', [
            'veiculo' => null,
            'obras'   => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validar($request);
        Veiculo::create($data);
        return redirect()->route('admin.frota.veiculos.index')
            ->with('success', 'Veiculo cadastrado.');
    }

    public function edit(Veiculo $veiculo): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Veiculos/Form', [
            'veiculo' => $veiculo,
            'obras'   => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
        ]);
    }

    public function update(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validar($request, $veiculo->id);
        $veiculo->update($data);
        return redirect()->route('admin.frota.veiculos.index')
            ->with('success', 'Veiculo atualizado.');
    }

    public function destroy(Veiculo $veiculo): RedirectResponse
    {
        $veiculo->delete();
        return redirect()->route('admin.frota.veiculos.index')
            ->with('success', 'Veiculo removido.');
    }

    protected function validar(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'obra_id' => 'nullable|exists:obras,id',
            'prefixo' => 'required|string|max:60',
            'tipo'    => 'nullable|string|max:30',
            'placa'   => 'nullable|string|max:12',
            'modelo'  => 'nullable|string|max:120',
            'marca'   => 'nullable|string|max:120',
            'ano'     => 'nullable|integer|min:1900|max:2100',
            'tipo_km' => 'boolean',
            'tipo_hr' => 'boolean',
            'imagem'  => 'nullable|string|max:255',
        ]);
    }
}
