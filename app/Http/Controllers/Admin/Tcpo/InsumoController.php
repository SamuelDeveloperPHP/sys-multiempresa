<?php

namespace App\Http\Controllers\Admin\Tcpo;

use App\Http\Controllers\Controller;
use App\Models\Tcpo\TcpoInsumo;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Navegação do catálogo de insumos TCPO (mão de obra / material / equipamento).
 * Somente leitura. Global, sem escopo por empresa.
 */
class InsumoController extends Controller
{
    public function index(Request $request)
    {
        $query = TcpoInsumo::query();

        if ($q = trim((string) $request->input('q'))) {
            $query->where(function ($w) use ($q) {
                $w->where('codigo', 'like', "%{$q}%")
                  ->orWhere('descricao', 'like', "%{$q}%");
            });
        }
        if (($classe = $request->input('classe')) !== null && $classe !== '') {
            $query->where('classe', $classe);
        }
        if ($base = $request->input('base')) {
            $query->where('base', $base);
        }

        $insumos = $query->orderBy('classe')->orderBy('descricao')
            ->paginate(30)->withQueryString();

        return Inertia::render('Admin/Tcpo/Insumos/Index', [
            'insumos' => $insumos,
            'bases'   => TcpoInsumo::query()->select('base')->distinct()->orderBy('base')->pluck('base'),
            'filtros' => $request->only(['q', 'classe', 'base']),
            'total'   => TcpoInsumo::count(),
        ]);
    }
}
