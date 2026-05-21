<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\TiposVeiculo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TiposVeiculoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = TiposVeiculo::query();

        if ($q = $request->string('q')->trim()->value()) {
            $query->where('nome', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/Frota/Tipos/Index', [
            'tipos'   => $query->orderBy('nome')->paginate(30)->withQueryString(),
            'filtros' => ['q' => $q ?? ''],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        TiposVeiculo::create($request->validate([
            'nome'   => 'required|string|max:80',
            'codigo' => 'nullable|string|max:30',
        ]));
        return back()->with('success', 'Tipo cadastrado.');
    }

    public function update(Request $request, TiposVeiculo $tipo): RedirectResponse
    {
        $tipo->update($request->validate([
            'nome'   => 'required|string|max:80',
            'codigo' => 'nullable|string|max:30',
        ]));
        return back()->with('success', 'Tipo atualizado.');
    }

    public function destroy(TiposVeiculo $tipo): RedirectResponse
    {
        $tipo->delete();
        return back()->with('success', 'Tipo removido.');
    }
}
