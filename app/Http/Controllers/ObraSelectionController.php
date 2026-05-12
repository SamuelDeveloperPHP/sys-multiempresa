<?php

namespace App\Http\Controllers;

use App\Helpers\CompanyContext;
use App\Helpers\ObraContext;
use App\Models\Obra;
use Illuminate\Http\Request;

/**
 * Controla o fluxo de seleção/troca de obra (análogo ao CompanyController::select/set).
 */
class ObraSelectionController extends Controller
{
    /** Tela de seleção de obra */
    public function select(Request $request)
    {
        $obras = ObraContext::userObras();

        // Se só existe uma obra, seleciona automaticamente
        if ($obras->count() === 1) {
            ObraContext::set($obras->first());
            return redirect()->intended(route('dashboard'));
        }

        return \Inertia\Inertia::render('Admin/Obras/Select', [
            'obras' => $obras
        ]);
    }

    /** Grava a obra escolhida na sessão */
    public function set(Request $request)
    {
        $request->validate([
            'obra_id' => 'required|integer|exists:obras,id',
        ]);

        $obraId = (int) $request->obra_id;

        if (! ObraContext::userCanAccess($obraId)) {
            return back()->withErrors(['obra_id' => 'Você não tem acesso a esta obra.']);
        }

        ObraContext::set($obraId);

        return redirect()->intended(route('dashboard'))
            ->with('success', 'Obra selecionada com sucesso.');
    }

    /** Troca de obra sem sair do admin */
    public function switch(Request $request)
    {
        $request->validate([
            'obra_id' => 'required|integer|exists:obras,id',
        ]);

        $obraId = (int) $request->obra_id;

        if (! ObraContext::userCanAccess($obraId)) {
            return back()->withErrors(['obra_id' => 'Sem acesso a esta obra.']);
        }

        ObraContext::set($obraId);

        return redirect()->back()
            ->with('success', 'Obra alterada.');
    }
}
