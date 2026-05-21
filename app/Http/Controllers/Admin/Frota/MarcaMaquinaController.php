<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\MarcaMaquina;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class MarcaMaquinaController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = MarcaMaquina::query()->withCount('modelos');

        if ($q = $request->string('q')->trim()->value()) {
            $query->where('marca', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/Frota/Marcas/Index', [
            'marcas'  => $query->orderBy('marca')->paginate(30)->withQueryString(),
            'filtros' => ['q' => $q ?? ''],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['marca' => 'required|string|max:120']);
        $data['user_create'] = Auth::user()?->email;

        MarcaMaquina::create($data);

        return back()->with('success', 'Marca cadastrada.');
    }

    public function update(Request $request, MarcaMaquina $marca): RedirectResponse
    {
        $marca->update($request->validate(['marca' => 'required|string|max:120']));
        return back()->with('success', 'Marca atualizada.');
    }

    public function destroy(MarcaMaquina $marca): RedirectResponse
    {
        $marca->delete();
        return back()->with('success', 'Marca removida.');
    }
}
