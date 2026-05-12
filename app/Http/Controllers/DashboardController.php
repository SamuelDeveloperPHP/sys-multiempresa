<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Company;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Empresa atual (vinda da sessão)
        $currentCompanyId = session('current_company_id');

        $currentCompany = null;
        if ($currentCompanyId) {
            $currentCompany = Company::find($currentCompanyId);
        }

        // Empresas vinculadas ao usuário (para mostrar no topo, por exemplo)
        $companies = $user->companies()->orderBy('name')->get();

        

        return \Inertia\Inertia::render('Admin/Dashboard', [
            'companies'      => $companies,
            'currentCompany' => $currentCompany,
        ]);
    }
}
