<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\MarcaMaquina;
use App\Models\Frota\ModeloMaquina;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ModeloMaquinaController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = ModeloMaquina::query()->with('marca:id,marca');

        if ($marcaId = $request->input('marca_id')) {
            $query->where('marca_id', $marcaId);
        }
        if ($q = $request->string('q')->trim()->value()) {
            $query->where('modelo', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/Frota/Modelos/Index', [
            'modelos' => $query->orderBy('modelo')->paginate(30)->withQueryString(),
            'marcas'  => MarcaMaquina::orderBy('marca')->get(['id', 'marca']),
            'filtros' => $request->only(['q', 'marca_id']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'modelo'   => 'required|string|max:120',
            'marca_id' => 'nullable|exists:marca_maquinas,id',
        ]);
        $data['user_create'] = Auth::user()?->email;

        ModeloMaquina::create($data);

        return back()->with('success', 'Modelo cadastrado.');
    }

    public function update(Request $request, ModeloMaquina $modelo): RedirectResponse
    {
        $modelo->update($request->validate([
            'modelo'   => 'required|string|max:120',
            'marca_id' => 'nullable|exists:marca_maquinas,id',
        ]));
        return back()->with('success', 'Modelo atualizado.');
    }

    public function destroy(ModeloMaquina $modelo): RedirectResponse
    {
        $modelo->delete();
        return back()->with('success', 'Modelo removido.');
    }
}
