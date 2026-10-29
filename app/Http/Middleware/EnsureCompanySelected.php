<?php

namespace App\Http\Middleware;

use Closure;
use App\Helpers\CompanyContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanySelected
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $companyId = CompanyContext::id();
            if (!$companyId || !CompanyContext::userCanAccess($companyId)) {
                CompanyContext::clear();
                session()->forget('current_obra_id');

                if ($request->is('api/mobile/*') || $request->expectsJson()) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Selecione uma empresa à qual você tenha acesso.',
                        'code' => 'company_context_required',
                    ], Response::HTTP_FORBIDDEN);
                }

                return redirect()->route('companies.select');
            }
        }

        return $next($request);
    }

}
