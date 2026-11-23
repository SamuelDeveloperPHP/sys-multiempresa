<?php

namespace App\Http\Middleware;

use App\Helpers\CompanyContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class FleetModuleAccess
{
    public function handle(Request $request, Closure $next, string $module, string $ability): Response
    {
        $company = CompanyContext::id();
        abort_unless($company && $request->user()?->hasModulePermission($company, $module, $ability), 403);

        return $next($request);
    }
}
