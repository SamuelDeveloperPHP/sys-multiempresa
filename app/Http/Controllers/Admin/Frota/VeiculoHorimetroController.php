<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Admin\Frota\Concerns\ResumoMedidor;
use App\Http\Controllers\Controller;
use App\Models\Frota\VeiculoHorimetro;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Horimetros sao registrados pelo mobile. Painel do gerente: resumo por veiculo
 * (ultima leitura + atraso) e leituras INCONSISTENTES para limpeza (excluir).
 */
class VeiculoHorimetroController extends Controller
{
    use ResumoMedidor;

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Horimetros/Index', $this->dadosPainelMedidor(
            $request, VeiculoHorimetro::class, 'horimetro_atual', 'horimetro_novo', 'data_horimetro', 'hr', 2000, 'tipo_hr',
        ));
    }

    public function destroy(VeiculoHorimetro $horimetro): \Illuminate\Http\RedirectResponse
    {
        $horimetro->delete();
        return back()->with('success', 'Registro de horímetro removido.');
    }
}
