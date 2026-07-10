<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Admin\Frota\Concerns\ResumoMedidor;
use App\Http\Controllers\Controller;
use App\Models\Frota\VeiculoQuilometragem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoQuilometragemController extends Controller
{
    use ResumoMedidor;

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Quilometragem/Index', $this->dadosPainelMedidor(
            $request, VeiculoQuilometragem::class, 'quilometragem_atual', 'quilometragem_nova', 'data_quilometragem', 'km', 20000,
        ));
    }

    public function destroy(VeiculoQuilometragem $quilometragem): \Illuminate\Http\RedirectResponse
    {
        $quilometragem->delete();
        return back()->with('success', 'Registro de hodômetro removido.');
    }
}
