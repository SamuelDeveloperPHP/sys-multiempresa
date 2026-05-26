<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Gestão de "almoxarifes" — usuários autorizados a aprovar/rejeitar
 * devoluções de estoque. Mapeia para permissão can_edit no módulo
 * estoque.devolucoes (FASE 7.B).
 *
 * Por empresa: um usuário pode ser almoxarife da Empresa A mas não da B.
 * Super_admin sempre pode (não precisa de registro).
 */
class AlmoxarifeController extends Controller
{
    public function index(Request $request)
    {
        $companies = Company::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'razao_social']);
        $companySelecionada = (int) ($request->input('company_id') ?: CompanyContext::current()?->id ?: $companies->first()?->id);

        $module = Module::where('slug', 'estoque.devolucoes')->first();
        abort_if(!$module, 500, 'Módulo estoque.devolucoes não está cadastrado. Rode o seeder.');

        // Lista usuários com info se já são almoxarifes (can_edit na empresa)
        $busca = trim($request->input('q', ''));
        // users não tem soft delete (sem coluna deleted_at)
        $usersQuery = User::query()
            ->select('id', 'name', 'email', 'type')
            ->orderBy('name');

        if ($busca) {
            $usersQuery->where(function ($w) use ($busca) {
                $w->where('name', 'like', "%{$busca}%")
                  ->orWhere('email', 'like', "%{$busca}%");
            });
        }
        // Excluir motoristas (não fazem sentido aqui)
        $usersQuery->where('type', '!=', 'motorista');

        $users = $usersQuery->limit(200)->get();

        // Mapa de quem já tem can_edit na empresa selecionada
        $permissoesAtuais = ModulePermission::where('module_id', $module->id)
            ->where('company_id', $companySelecionada)
            ->whereIn('user_id', $users->pluck('id'))
            ->where('can_edit', true)
            ->pluck('user_id')
            ->all();

        $userList = $users->map(fn ($u) => [
            'id'           => $u->id,
            'name'         => $u->name,
            'email'        => $u->email,
            'type'         => $u->type,
            'eh_almoxarife' => in_array($u->id, $permissoesAtuais, true) || $u->type === 'super_admin',
            'eh_super'     => $u->type === 'super_admin',
        ]);

        return Inertia::render('Admin/Estoque/Almoxarifes/Index', [
            'companies'          => $companies,
            'companySelecionada' => $companySelecionada,
            'users'              => $userList,
            'busca'              => $busca,
            'totalAlmoxarifes'   => count($permissoesAtuais),
        ]);
    }

    /**
     * Alterna o status de almoxarife do user para a empresa selecionada.
     * Sincroniza ModulePermission (can_list + can_view + can_edit no módulo
     * estoque.devolucoes — pra ele conseguir listar/ver E aprovar).
     */
    public function toggle(Request $request)
    {
        $data = $request->validate([
            'user_id'    => 'required|integer|exists:users,id',
            'company_id' => 'required|integer|exists:companies,id',
            'ativar'     => 'required|boolean',
        ]);

        $user = User::find($data['user_id']);
        if ($user->type === 'super_admin') {
            return back()->with('error', 'Super-admins já têm acesso total — não precisam ser marcados como almoxarife.');
        }

        $module = Module::where('slug', 'estoque.devolucoes')->firstOrFail();

        DB::transaction(function () use ($data, $module) {
            if ($data['ativar']) {
                ModulePermission::updateOrCreate(
                    [
                        'user_id'    => $data['user_id'],
                        'module_id'  => $module->id,
                        'company_id' => $data['company_id'],
                    ],
                    [
                        'can_list'   => true,
                        'can_view'   => true,
                        'can_create' => true,  // pode também registrar devolução em nome de alguém
                        'can_edit'   => true,  // CHAVE — pode aprovar/rejeitar
                        'can_delete' => false,
                    ]
                );
            } else {
                // Remove a permissão de can_edit (mantém can_list/view se quiser ver mas não aprovar)
                ModulePermission::where('user_id', $data['user_id'])
                    ->where('module_id', $module->id)
                    ->where('company_id', $data['company_id'])
                    ->update(['can_edit' => false]);
            }
        });

        $action = $data['ativar'] ? 'ativado' : 'desativado';
        return back()->with('success', "Almoxarife {$action} com sucesso.");
    }

    /**
     * Bulk: aplica/remove almoxarife em vários users de uma vez.
     */
    public function bulkSync(Request $request)
    {
        $data = $request->validate([
            'company_id'  => 'required|integer|exists:companies,id',
            'user_ids'    => 'required|array|min:1',
            'user_ids.*'  => 'integer|exists:users,id',
            'ativar'      => 'required|boolean',
        ]);

        $module = Module::where('slug', 'estoque.devolucoes')->firstOrFail();
        $afetados = 0;

        DB::transaction(function () use ($data, $module, &$afetados) {
            $users = User::whereIn('id', $data['user_ids'])->where('type', '!=', 'super_admin')->get();
            foreach ($users as $u) {
                if ($data['ativar']) {
                    ModulePermission::updateOrCreate(
                        ['user_id' => $u->id, 'module_id' => $module->id, 'company_id' => $data['company_id']],
                        ['can_list' => true, 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false]
                    );
                } else {
                    ModulePermission::where('user_id', $u->id)
                        ->where('module_id', $module->id)
                        ->where('company_id', $data['company_id'])
                        ->update(['can_edit' => false]);
                }
                $afetados++;
            }
        });

        $action = $data['ativar'] ? 'marcados' : 'desmarcados';
        return back()->with('success', "{$afetados} usuário(s) {$action} como almoxarife.");
    }
}
