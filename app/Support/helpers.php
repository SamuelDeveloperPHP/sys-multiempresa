<?php

// app/Support/helpers.php (ou similar)

use App\Helpers\CompanyContext;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

if (! function_exists('log_activity')) {
    /**
     * Registra uma atividade de auditoria.
     */
    function log_activity(string $action, array $data = []): void
    {
        try {
            $user    = Auth::user();
            $company = class_exists(CompanyContext::class)
                ? CompanyContext::current()
                : null;

            AuditLog::create([
                'user_id'    => $user?->id,
                'company_id' => $company?->id,

                'module'     => $data['module']     ?? null,      // ex: 'blog', 'users'
                'action'     => $action,                         // ex: 'access_view'
                'route_name' => $data['route_name'] ?? request()->route()?->getName(),

                'model_type' => $data['model_type'] ?? null,
                'model_id'   => $data['model_id']   ?? null,

                'description' => $data['description'] ?? null,

                'before'     => $data['before'] ?? null,
                'after'      => $data['after']  ?? null,

                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            // não quebrar a app por causa da auditoria
            logger()->error('Erro ao registrar audit_log', [
                'msg'   => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
