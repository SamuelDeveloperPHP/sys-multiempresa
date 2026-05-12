<?php

namespace App\Http\Middleware;

use App\Helpers\CompanyContext;
use App\Models\Module;
use Closure;
use Illuminate\Http\Request;

class ModuleAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // 🔐 Super admin tem acesso total (mas ainda podemos logar o acesso)
        if ($user->type === 'super_admin') {
            log_activity('access_super_admin', [
                'module'     => null,
                'route_name' => $request->route()?->getName(),
            ]);
            return $next($request);
        }

        $route     = $request->route();
        $routeName = $route?->getName();

        if (!$routeName) {
            // rota sem nome (assets, etc.)
            return $next($request);
        }

        // 1) Tenta achar módulo com route_name exato
        $module = Module::where('is_active', true)
            ->where('route_name', $routeName)
            ->first();

        // 2) Se não achou, tenta procurar um módulo pai reduzindo a rota até achar um ".index"
        if (!$module && str_contains($routeName, '.')) {
            $parts = explode('.', $routeName);
            
            while (count($parts) > 1) {
                array_pop($parts);
                $indexRoute = implode('.', $parts) . '.index';
                
                $module = Module::where('is_active', true)
                    ->where('route_name', $indexRoute)
                    ->first();
                    
                if ($module) {
                    break;
                }
            }
        }

        if (!$module) {
            // aqui também dá pra logar tentativa em rota sem módulo
            log_activity('access_denied_no_module', [
                'route_name' => $routeName,
            ]);

            abort(403, 'Rota não permitida pelo módulo.');
        }

        $company = CompanyContext::current();
        if (!$company) {
            abort(403, 'Empresa não selecionada.');
        }

        // Descobre habilidade com base no método da action
        $action = $route->getActionMethod();

        $ability = match ($action) {
            'index', 'active', 'inactive', 'list'     => 'list',
            'show', 'details', 'detalhes'             => 'view',
            'create', 'store'                         => 'create',
            'edit', 'update'                          => 'edit',
            'destroy', 'delete', 'remove', 'remover'  => 'delete',
            default                                   => 'view',
        };

        $permission = $user->modulePermissions()
            ->where('company_id', $company->id)
            ->where('module_id', $module->id)
            ->first();

        if (!$permission || !$permission->{"can_{$ability}"}) {
            // 🔴 Loga tentativa negada
            log_activity('access_denied', [
                'module'     => $module->slug,
                'route_name' => $routeName,
                'after'      => [
                    'ability'    => $ability,
                    'company_id' => $company->id,
                ],
            ]);

            abort(403, 'Você não tem permissão para ' . $ability . ' este módulo.');
        }

        // ✅ Loga acesso permitido (opcional – às vezes dá muito log)
        log_activity('access_'.$ability, [
            'module'     => $module->slug,
            'route_name' => $routeName,
            'after'      => [
                'company_id' => $company->id,
            ],
        ]);

        return $next($request);
    }
}
