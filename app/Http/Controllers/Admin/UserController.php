<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use App\Rules\StrongPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\WelcomeUserMail;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Throwable;

class UserController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = User::with('companies');

            // Busca por nome ou e-mail
            if ($search = $request->input('q')) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Filtro por tipo
            if ($type = $request->input('type')) {
                $query->where('type', $type);
            }

            // Filtro por status (ativo/inativo)
            if ($status = $request->input('status')) {
                if ($status === 'active') {
                    $query->where('is_active', 1);
                } elseif ($status === 'inactive') {
                    $query->where('is_active', 0);
                }
            }

            // Filtro por empresa
            if ($companyId = $request->input('company_id')) {
                $query->whereHas('companies', function ($q) use ($companyId) {
                    $q->where('companies.id', $companyId);
                });
            }

            // Filtro por online/offline (opcional)
            if ($online = $request->input('online')) {
                if ($online === 'yes') {
                    $query->whereNotNull('last_seen_at')
                        ->where('last_seen_at', '>=', now()->subMinutes(5));
                } elseif ($online === 'no') {
                    $query->where(function ($q) {
                        $q->whereNull('last_seen_at')
                            ->orWhere('last_seen_at', '<', now()->subMinutes(5));
                    });
                }
            }

            $users = $query
                ->orderBy('name')
                ->paginate(20)
                ->withQueryString(); // mantém filtros na paginação

            $companies = Company::orderBy('name')->get();

            $filters = $request->only(['q', 'type', 'status', 'company_id', 'online']);

            return Inertia::render('Admin/Users/Index', [
                'users'     => $users,
                'companies' => $companies,
                'filters'   => $filters,
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao listar usuários', [
                'filtros' => $request->all(),
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao listar usuários. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function create()
    {
        try {
            $companies = Company::orderBy('name')->get();

            // 🔹 Carrega TODOS os módulos ativos para o formulário
            $modules = Module::query()
                ->active()
                ->orderBy('ordem')
                ->orderBy('name')
                ->get();

            // 🔹 Agrupa por módulo base (id_modulo_relacionamento ou id)
            // Agrupa filhos sob o pai (parent_id); raízes ficam sob o próprio id.
            // parent_id é a fonte canônica usada pelo sidebar (ViewServiceProvider).
            $groupedModules = $modules->groupBy(function ($module) {
                return $module->parent_id ?: $module->id;
            });

            return Inertia::render('Admin/Users/Create', [
                'companies'      => $companies,
                'groupedModules' => $groupedModules,
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao carregar formulário de novo usuário', [
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }



    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'name'        => 'required|string|max:255',
                'email'       => 'required|email|unique:users,email',
                'password'    => ['required', 'confirmed', 'min:8', new StrongPassword],
                'type'        => 'required|string|in:super_admin,admin,user',
                'is_active'   => 'boolean',
                'companies'   => 'array',
                'companies.*' => 'exists:companies,id',

                // permissões de módulos vem como permissions[module_id][can_*]
                'permissions'              => 'array',
                'permissions.*.module_id'  => 'nullable|integer|exists:modules,id',
            ]);

            $user = User::create([
                'name'      => $data['name'],
                'email'     => $data['email'],
                'password'  => Hash::make($data['password']),
                'type'      => $data['type'],
                'is_active' => $request->boolean('is_active'),
            ]);

            // Vinculo de empresas
            if (!empty($data['companies'])) {
                $user->companies()->sync(
                    array_fill_keys($data['companies'], ['role' => 'user'])
                );
            }

            // Permissões de módulos (CRUD)
            $this->syncModulePermissionsFromRequest($request, $user);

            // E-mail de boas-vindas
            if ($user->is_active) {
                $this->sendWelcomeEmail($user, $data['password']);
            }

            return redirect()
                ->route('admin.users.index')
                ->with('success', 'Usuário criado com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao criar usuário', [
                'dados' => $request->all(),
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao criar usuário. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function edit(User $user)
    {
        try {
            $companies         = Company::orderBy('name')->get();
            $selectedCompanies = $user->companies->pluck('id')->toArray();

            // 🔹 SEM FILTRO por permissões do usuário logado
            $modules = Module::query()
                ->active()
                ->orderBy('ordem')
                ->orderBy('name')
                ->get();

            // Agrupa filhos sob o pai (parent_id); raízes ficam sob o próprio id.
            // parent_id é a fonte canônica usada pelo sidebar (ViewServiceProvider).
            $groupedModules = $modules->groupBy(function ($module) {
                return $module->parent_id ?: $module->id;
            });

            // Permissões existentes do USUÁRIO que está sendo editado
            $modulePermissions = ModulePermission::where('user_id', $user->id)
                ->get()
                ->keyBy('module_id');

            return Inertia::render('Admin/Users/Edit', [
                'user'              => $user,
                'companies'         => $companies,
                'selectedCompanies' => $selectedCompanies,
                'groupedModules'    => $groupedModules,
                'modulePermissions' => $modulePermissions,
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao carregar formulário de edição de usuário', [
                'user_id' => $user->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }



    public function update(Request $request, User $user)
    {

        try {
            $data = $request->validate([
                'name'        => 'required|string|max:255',
                'email'       => 'required|email|unique:users,email,' . $user->id,
                'password'    => ['nullable', 'confirmed', 'min:8', new StrongPassword],
                'type'        => 'required|string|in:super_admin,admin,user',
                'is_active'   => 'boolean',
                'companies'   => 'array',
                'companies.*' => 'exists:companies,id',

                'permissions'              => 'array',
                'permissions.*.module_id'  => 'nullable|integer|exists:modules,id',
            ]);

            $payload = [
                'name'      => $data['name'],
                'email'     => $data['email'],
                'type'      => $data['type'],
                'is_active' => $request->boolean('is_active'),
            ];

            $passwordPlain = null;

            if (!empty($data['password'])) {
                $payload['password'] = Hash::make($data['password']);
                $passwordPlain       = $data['password'];
            }

            $wasInactive = !$user->is_active && $payload['is_active'];

            $user->update($payload);

            // Atualiza empresas
            $user->companies()->sync(
                !empty($data['companies'])
                    ? array_fill_keys($data['companies'], ['role' => 'user'])
                    : []
            );

            // Atualiza permissões de módulos
            $this->syncModulePermissionsFromRequest($request, $user);

            if ($wasInactive) {
                $this->sendWelcomeEmail($user, $passwordPlain);
            }

            return redirect()
                ->route('admin.users.index')
                ->with('success', 'Usuário atualizado com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao atualizar usuário', [
                'user_id' => $user->id ?? null,
                'dados'   => $request->all(),
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao atualizar usuário. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function destroy(User $user)
    {
        try {
            if (auth()->id() === $user->id) {
                return back()->with('error', 'Você não pode excluir a si mesmo.');
            }

            // apaga também as permissões de módulos desse usuário
            ModulePermission::where('user_id', $user->id)->delete();

            $user->delete();

            return redirect()
                ->route('admin.users.index')
                ->with('success', 'Usuário removido.');
        } catch (Throwable $e) {
            Log::error('Erro ao remover usuário', [
                'user_id' => $user->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao remover usuário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function toggleStatus(User $user)
    {
        try {
            $user->is_active = !$user->is_active;
            $user->save();

            if ($user->is_active) {
                $this->sendWelcomeEmail($user, null);
            }

            return back()->with(
                'success',
                $user->is_active ? 'Usuário desbloqueado.' : 'Usuário bloqueado.'
            );
        } catch (Throwable $e) {
            Log::error('Erro ao alterar status do usuário', [
                'user_id' => $user->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao alterar status. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function toggleActive(User $user)
    {
        // se quiser manter esse método separado, reaproveita o toggleStatus
        return $this->toggleStatus($user);
    }

    public function active(Request $request)
    {
        $request->merge(['status' => 'active']);

        return $this->index($request);
    }

    public function inactive(Request $request)
    {
        $request->merge(['status' => 'inactive']);

        return $this->index($request);
    }

    public function permissionsIndex()
    {
        return redirect()
            ->route('admin.users.index')
            ->with('success', 'As permissÃµes de mÃ³dulos sÃ£o gerenciadas na criaÃ§Ã£o e ediÃ§Ã£o de usuÃ¡rios.');
    }

    public function show(User $user)
    {
        return redirect()->route('admin.users.edit', $user);
    }

    protected function sendWelcomeEmail(User $user, ?string $plainPassword): void
    {
        try {
            Mail::to($user->email)->send(new WelcomeUserMail($user, $plainPassword));
        } catch (Throwable $e) {
            Log::error('Erro ao enviar e-mail de boas-vindas', [
                'user_id' => $user->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);
        }
    }

    /**
     * Lê as checkboxes do formulário e sincroniza as permissões de módulos
     * para o usuário.
     *
     * Estrutura esperada no request:
     * permissions[module_id][list|view|create|edit|delete] = '1' (checkbox)
     *
     * company_id: se quiser amarrar por empresa, aqui você decide. Neste exemplo
     * estou deixando como null (permissão global por usuário+módulo).
     */
    protected function syncModulePermissionsFromRequest(Request $request, User $user): void
    {
        // 🔹 Super Admin não precisa gravar/limpar permissões —
        // ele sempre enxerga tudo pelo tipo, não pela tabela module_permissions.
        if ($user->type === 'super_admin') {
            return;
        }

        $permissionsInput = $request->input('permissions', []); // [module_id => [list,view,...]]
        $companyIds       = $request->input('companies', []);   // [1,2,3...]

        if (empty($companyIds)) {
            // remove tudo e loga
            $oldPerms = ModulePermission::where('user_id', $user->id)->get()->toArray();

            ModulePermission::where('user_id', $user->id)->delete();

            if (!empty($oldPerms)) {
                log_activity('permissions_cleared', [
                    'module' => 'user-permissions',
                    'before' => $oldPerms,
                    'after'  => [],
                    'model_type' => User::class,
                    'model_id'   => $user->id,
                ]);
            }

            return;
        }
        ModulePermission::where('user_id', $user->id)
            ->whereNotIn('company_id', $companyIds)
            ->delete();

        if (empty($permissionsInput)) {
            ModulePermission::where('user_id', $user->id)
                ->whereIn('company_id', $companyIds)
                ->delete();
            return;
        }

        foreach ($companyIds as $companyId) {
            $companyId = (int) $companyId;

            foreach ($permissionsInput as $moduleId => $perm) {
                $moduleId = (int) $moduleId;

                $canList   = !empty($perm['list']);
                $canView   = !empty($perm['view']);
                $canCreate = !empty($perm['create']);
                $canEdit   = !empty($perm['edit']);
                $canDelete = !empty($perm['delete']);

                $hasAny = $canList || $canView || $canCreate || $canEdit || $canDelete;

                $existing = ModulePermission::where('company_id', $companyId)
                    ->where('user_id', $user->id)
                    ->where('module_id', $moduleId)
                    ->first();

                // Se não marcou nenhuma habilidade: remove registro existente
                if (!$hasAny) {
                    if ($existing) {
                        log_activity('permission_revoked', [
                            'module' => Module::find($moduleId)?->slug,
                            'before' => $existing->toArray(),
                            'after'  => [],
                            'model_type' => ModulePermission::class,
                            'model_id'   => $existing->id,
                        ]);
                        $existing->delete();
                    }
                    continue;
                }

                $abilities = [
                    'can_list'   => $canList,
                    'can_view'   => $canView,
                    'can_create' => $canCreate,
                    'can_edit'   => $canEdit,
                    'can_delete' => $canDelete,
                ];

                $before = $existing?->toArray() ?? [];

                // Idempotente: atualiza se existe, cria se não existe (sem race condition)
                $record = ModulePermission::updateOrCreate(
                    [
                        'company_id' => $companyId,
                        'user_id'    => $user->id,
                        'module_id'  => $moduleId,
                    ],
                    $abilities
                );

                log_activity($existing ? 'permission_updated' : 'permission_granted', [
                    'module'     => Module::find($moduleId)?->slug,
                    'before'     => $before,
                    'after'      => $record->fresh()->toArray(),
                    'model_type' => ModulePermission::class,
                    'model_id'   => $record->id,
                ]);
            }
        }
    }
}
