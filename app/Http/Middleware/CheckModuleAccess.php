<?php

// app/Http/Middleware/CheckModuleAccess.php
namespace App\Http\Middleware;

use App\Helpers\CompanyContext;
use App\Models\Module;
use Closure;
use Illuminate\Http\Request;

class CheckModuleAccess
{
    public function handle(Request $request, Closure $next)
    {
        if (!auth()->check()) {
            return $next($request); // quem cuida é o 'auth'
        }

        $routeName = $request->route()?->getName();

        // sem nome de rota → deixa passar (ex.: assets, etc.)
        if (!$routeName) {
            return $next($request);
        }

        $module = Module::where('route_name', $routeName)
            ->where('is_active', true)
            ->first();

        // se não existe módulo para essa rota, você pode:
        // 1) deixar passar (rotas "fora" da permissão)
        // 2) OU bloquear. Vou seguir opção 1 (mais flexível):
        if (!$module) {
            return $next($request);
        }

        $company = CompanyContext::current();
        $user    = auth()->user();

        if (!$company || !$user) {
            abort(403, 'Empresa ou usuário não definidos.');
        }

        $hasPermission = $user->modulePermissions()
            ->where('company_id', $company->id)
            ->where('module_id', $module->id)
            ->where(function ($q) {
                $q->where('can_view', true)
                    ->orWhere('can_list', true);
            })
            ->exists();

        if (!$hasPermission) {
            abort(403, 'Você não tem permissão para acessar este módulo.');
        }

        return $next($request);
    }
}
