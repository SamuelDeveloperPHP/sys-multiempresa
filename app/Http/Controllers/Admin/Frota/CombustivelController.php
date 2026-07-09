<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Combustivel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * CRUD dos combustíveis + fatores de emissão (tela de referência do admin).
 * Ver App\Models\Frota\Combustivel e a migration 2026_07_09_130000.
 */
class CombustivelController extends Controller
{
    public function index(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Combustiveis/Index', [
            'combustiveis' => Combustivel::orderBy('ordem')->orderBy('nome')->get()->map(fn ($c) => [
                'id'                  => $c->id,
                'nome'                => $c->nome,
                'fator_fossil'        => (float) $c->fator_fossil,
                'fator_biogenico'     => (float) $c->fator_biogenico,
                'perc_biogenico'      => (float) $c->perc_biogenico,
                'co2_fossil_litro'    => round($c->co2FossilPorLitro(), 4),
                'co2_biogenico_litro' => round($c->co2BiogenicoPorLitro(), 4),
                'ativo'               => $c->ativo,
                'ordem'               => $c->ordem,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Combustivel::create($this->validar($request));
        return back()->with('success', 'Combustível cadastrado.');
    }

    public function update(Request $request, Combustivel $combustivel): RedirectResponse
    {
        $combustivel->update($this->validar($request, $combustivel->id));
        return back()->with('success', 'Combustível atualizado.');
    }

    public function destroy(Combustivel $combustivel): RedirectResponse
    {
        $combustivel->delete();
        return back()->with('success', 'Combustível removido.');
    }

    protected function validar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'nome'            => 'required|string|max:60|unique:combustiveis,nome' . ($id ? ",{$id}" : ''),
            'fator_fossil'    => 'required|numeric|min:0|max:99',
            'fator_biogenico' => 'required|numeric|min:0|max:99',
            'perc_biogenico'  => 'required|numeric|min:0|max:1', // fração 0..1
            'ativo'           => 'boolean',
            'ordem'           => 'nullable|integer|min:0',
        ]);
    }
}
