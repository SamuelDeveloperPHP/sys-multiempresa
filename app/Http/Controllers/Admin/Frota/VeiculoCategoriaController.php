<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\VeiculoCategoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoCategoriaController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoCategoria::query()->withCount('subcategorias');

        if ($q = $request->string('q')->trim()->value()) {
            $query->where('nome_categoria', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/Frota/Categorias/Index', [
            'categorias' => $query->orderBy('nome_categoria')->paginate(30)->withQueryString(),
            'filtros'    => ['q' => $q ?? ''],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nome_categoria'   => 'required|string|max:120',
            'status_categoria' => 'nullable|string|max:30',
        ]);
        $data['status_categoria'] = $data['status_categoria'] ?? 'Ativo';
        $data['user_create']      = Auth::user()?->email;

        VeiculoCategoria::create($data);

        return back()->with('success', 'Categoria cadastrada.');
    }

    public function update(Request $request, VeiculoCategoria $categoria): RedirectResponse
    {
        $data = $request->validate([
            'nome_categoria'   => 'required|string|max:120',
            'status_categoria' => 'nullable|string|max:30',
        ]);
        $data['user_edit'] = Auth::user()?->email;

        $categoria->update($data);

        return back()->with('success', 'Categoria atualizada.');
    }

    public function destroy(VeiculoCategoria $categoria): RedirectResponse
    {
        $categoria->delete();
        return back()->with('success', 'Categoria removida.');
    }
}
