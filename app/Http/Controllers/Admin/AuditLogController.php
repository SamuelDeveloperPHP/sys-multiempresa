<?php

// app/Http/Controllers/Admin/AuditLogController.php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = AuditLog::with(['user', 'company'])->orderByDesc('created_at');

            // 🔍 Filtros
            if ($userId = $request->input('user_id')) {
                $query->where('user_id', $userId);
            }

            if ($companyId = $request->input('company_id')) {
                $query->where('company_id', $companyId);
            }

            if ($module = $request->input('module')) {
                $query->where('module', $module);
            }

            if ($action = $request->input('action')) {
                $query->where('action', $action);
            }

            if ($route = $request->input('route_name')) {
                $query->where('route_name', 'like', "%{$route}%");
            }

            if ($q = $request->input('q')) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('description', 'like', "%{$q}%")
                        ->orWhere('route_name', 'like', "%{$q}%")
                        ->orWhere('module', 'like', "%{$q}%");
                });
            }

            if ($from = $request->input('date_from')) {
                $query->whereDate('created_at', '>=', $from);
            }

            if ($to = $request->input('date_to')) {
                $query->whereDate('created_at', '<=', $to);
            }

            $logs = $query->paginate(30)->withQueryString();

            $users     = User::orderBy('name')->get();
            $companies = Company::orderBy('name')->get();

            // ações distintas para preencher o select
            $actions = AuditLog::select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action');

            $modules = AuditLog::select('module')
                ->distinct()
                ->orderBy('module')
                ->pluck('module');

            $filters = $request->only([
                'user_id', 'company_id', 'module', 'action',
                'route_name', 'date_from', 'date_to', 'q',
            ]);

            return \Inertia\Inertia::render('Admin/Audit/Index', [
                'logs' => $logs,
                'users' => $users,
                'companies' => $companies,
                'actions' => $actions,
                'modules' => $modules,
                'filters' => $filters,
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao listar audit_logs', [
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar auditoria. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }
}
