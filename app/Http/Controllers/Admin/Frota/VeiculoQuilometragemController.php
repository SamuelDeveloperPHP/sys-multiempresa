<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoQuilometragem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoQuilometragemController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoQuilometragem::query()->with(['veiculo:id,prefixo,placa']);
        if ($v = $request->input('veiculo_id')) $query->where('veiculo_id', $v);

        return Inertia::render('Admin/Frota/Quilometragem/Index', [
            'registros' => $query->orderByDesc('data_quilometragem')->paginate(30)->withQueryString(),
            'veiculos'  => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'filtros'   => $request->only(['veiculo_id']),
        ]);
    }

    public function destroy(VeiculoQuilometragem $quilometragem): \Illuminate\Http\RedirectResponse
    {
        $quilometragem->delete();
        return back()->with('success', 'Registro de hodômetro removido.');
    }
}
