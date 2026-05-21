<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\VeiculoCategoria;
use App\Models\Frota\VeiculoSubCategoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoSubCategoriaController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoSubCategoria::query()->with('categoria:id,nome_categoria');

        if ($cat = $request->input('id_categoria')) {
            $query->where('id_categoria', $cat);
        }
        if ($q = $request->string('q')->trim()->value()) {
            $query->where('nome_subcategoria', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/Frota/Subcategorias/Index', [
            'subcategorias' => $query->orderBy('nome_subcategoria')->paginate(30)->withQueryString(),
            'categorias'    => VeiculoCategoria::orderBy('nome_categoria')->get(['id', 'nome_categoria']),
            'filtros'       => $request->only(['q', 'id_categoria']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'id_categoria'        => 'required|exists:veiculo_categorias,id',
            'nome_subcategoria'   => 'required|string|max:120',
            'status_subcategoria' => 'nullable|string|max:30',
        ]);
        $data['status_subcategoria'] = $data['status_subcategoria'] ?? 'Ativo';
        $data['user_create']         = Auth::user()?->email;

        VeiculoSubCategoria::create($data);

        return back()->with('success', 'Subcategoria cadastrada.');
    }

    public function update(Request $request, VeiculoSubCategoria $subcategoria): RedirectResponse
    {
        $data = $request->validate([
            'id_categoria'        => 'required|exists:veiculo_categorias,id',
            'nome_subcategoria'   => 'required|string|max:120',
            'status_subcategoria' => 'nullable|string|max:30',
        ]);
        $data['user_edit'] = Auth::user()?->email;

        $subcategoria->update($data);

        return back()->with('success', 'Subcategoria atualizada.');
    }

    public function destroy(VeiculoSubCategoria $subcategoria): RedirectResponse
    {
        $subcategoria->delete();
        return back()->with('success', 'Subcategoria removida.');
    }
}
