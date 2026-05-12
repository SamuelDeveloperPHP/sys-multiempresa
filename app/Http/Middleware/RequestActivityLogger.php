<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use App\Helpers\CompanyContext;
use Illuminate\Support\Facades\Log;
use App\Support\activity;

class RequestActivityLogger
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        try {
            $user    = Auth::user();
            $company = CompanyContext::current();

            // só usuários logados
            if (!auth()->check()) {
                return $response;
            }

            log_activity('request', [   
                'module'     => null,
                'route_name' => $request->route()?->getName(),
                'url'        => $request->fullUrl(),
                'method'     => $request->method(),
                'model_type' => null,
                'model_id'   => null,
                'before'     => null,
                'after'      => null,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string)$request->userAgent(), 0, 500),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Falha ao registrar activity_log de requisição', [
                'msg' => $e->getMessage(),
            ]);
        }

        return $response;
    }
}
