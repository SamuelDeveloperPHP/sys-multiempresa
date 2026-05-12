<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoHorimetro;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Horimetros sao registrados pelo mobile (checklists, abastecimentos, diario).
 * Tela de admin eh consulta + relatorio. Permite exclusao excepcional.
 */
class VeiculoHorimetroController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoHorimetro::query()->with(['veiculo:id,prefixo,placa']);
        if ($v = $request->input('veiculo_id')) $query->where('veiculo_id', $v);

        return Inertia::render('Admin/Frota/Horimetros/Index', [
            'horimetros' => $query->orderByDesc('data_horimetro')->paginate(30)->withQueryString(),
            'veiculos'   => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'filtros'    => $request->only(['veiculo_id']),
        ]);
    }

    public function destroy(VeiculoHorimetro $horimetro): \Illuminate\Http\RedirectResponse
    {
        $horimetro->delete();
        return back()->with('success', 'Registro de horímetro removido.');
    }
}
