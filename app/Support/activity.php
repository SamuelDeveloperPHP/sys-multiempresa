<?php

// app/Support/activity.php (por exemplo)

use App\Helpers\CompanyContext;
use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

if (! function_exists('log_activity')) {
    function log_activity(string $action, array $extra = [], ?Model $model = null): void
    {
        try {
            $user    = Auth::user();
            $company = CompanyContext::current();
            $request = request();

            ActivityLog::create([
                'company_id' => $company?->id,
                'user_id'    => $user?->id,
                'action'     => $action,
                'module'     => $extra['module']     ?? null,
                'route_name' => $extra['route_name'] ?? $request->route()?->getName(),
                'url'        => $extra['url']        ?? $request->fullUrl(),
                'method'     => $extra['method']     ?? $request->method(),
                'model_type' => $model ? get_class($model) : ($extra['model_type'] ?? null),
                'model_id'   => $model?->getKey() ?? ($extra['model_id'] ?? null),
                'before'     => $extra['before'] ?? null,
                'after'      => $extra['after']  ?? null,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string)$request->userAgent(), 0, 500),
            ]);
        } catch (\Throwable $e) {
            // evita quebrar a app por causa do log
            Log::warning('Falha ao registrar activity_log', [
                'action' => $action,
                'msg'    => $e->getMessage(),
            ]);
        }
    }
}
