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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Inertia\Inertia;
use Throwable;

class UserController extends Controller
{
    private function localCompany(): ?int
    {
        if (auth()->user()->type === 'super_admin') {
            return null;
        }

        $company = CompanyContext::id();
        abort_unless($company && auth()->user()->companies()->whereKey($company)->exists(), 403);
        return $company;
    }

    private function assignableTypes(): array
    {
        return match (auth()->user()->type) {
            'super_admin' => ['super_admin', 'admin', 'manager', 'motorista', 'user'],
            'manager' => ['manager', 'motorista', 'user'],
            'admin' => ['motorista', 'user'],
            default => ['user'],
        };
    }

    private function visibleCompanies()
    {
        $company = $this->localCompany();
        return Company::orderBy('name')->when($company, fn ($q) => $q->whereKey($company))->get();
    }

    private function visibleUsers(?int $company)
    {
        $query = User::query();
        if ($company) {
            $query->whereIn('type', $this->assignableTypes())
                ->whereHas('companies', fn ($q) => $q->whereKey($company))
                ->with(['companies' => fn ($q) => $q->whereKey($company)]);
        } else {
            $query->with('companies');
        }
        return $query;
    }

    private function managedUser(User $user, bool $lock = false): User
    {
        $query = $this->visibleUsers($this->localCompany());
        $target = $query->when($lock, fn ($q) => $q->lockForUpdate())->findOrFail($user->id);
        if ($lock && $this->localCompany()) {
            $existing = $target->modulePermissions()->get();
            $this->assertDelegable($existing->mapWithKeys(fn ($row) => [
                $row->module_id => collect(['list', 'view', 'create', 'edit', 'delete'])
                    ->mapWithKeys(fn ($ability) => [$ability => $row->{'can_'.$ability}])->all(),
            ])->all());
        }
        return $target;
    }

    private function assertDelegable(array $requested): void
    {
        $grants = auth()->user()->modulePermissions()->where('company_id', $this->localCompany())
            ->get()->keyBy('module_id');
        foreach ($requested as $module => $abilities) {
            foreach (['list', 'view', 'create', 'edit', 'delete'] as $ability) {
                if (!empty($abilities[$ability])) {
                    abort_unless($grants->get($module)?->{'can_'.$ability}, 403);
                }
            }
        }
    }

    private function sharedIdentity(User $user, ?int $company): bool
    {
        return $company && ($user->companies()->where('companies.id', '!=', $company)->exists()
            || ($user->company_id && (int) $user->company_id !== $company));
    }

    public function index(Request $request)
    {
        $company = $this->localCompany();
        abort_if($company && $request->filled('company_id') && (int) $request->company_id !== $company, 403);
        try {
            $query = $this->visibleUsers($company);

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
                ->through(fn ($account) => $account->makeHidden(['password_app', 'google2fa_secret', 'perfil_offline']))
                ->withQueryString();

            $companies = $this->visibleCompanies();

            $filters = $request->only(['q', 'type', 'status', 'company_id', 'online']);

            return Inertia::render('Admin/Users/Index', [
                'users'     => $users,
                'companies' => $companies,
                'filters'   => $filters,
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao listar usuários', [
                'actor_id' => $request->user()->id,
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
            $companies = $this->visibleCompanies();

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
                'assignableTypes' => $this->assignableTypes(),
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
        return $this->saveAccount($request);
    }

    public function edit(User $user)
    {
        $user = $this->managedUser($user);
        try {
            $companies         = $this->visibleCompanies();
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
                'assignableTypes' => $this->assignableTypes(),
                'user'              => $user->makeHidden(['password_app', 'google2fa_secret', 'perfil_offline']),
                'companies'         => $companies,
                'selectedCompanies' => $selectedCompanies,
                'sharedIdentity' => $this->sharedIdentity($user, $this->localCompany()),
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
        return $this->saveAccount($request, $user);
    }

    private function saveAccount(Request $request, ?User $target = null)
    {
        $company = $this->localCompany();
        try {
            [$user, $notify] = DB::transaction(function () use ($request, $target, $company) {
                $user = $target ? $this->managedUser($target, true) : new User();
                $shared = $target && $this->sharedIdentity($user, $company);
                $data = $request->validate([
                    'name' => ['required', 'string', 'max:255'],
                    'email' => ['required', 'email', Rule::unique('users')->ignore($user)],
                    'password' => [$target ? 'nullable' : 'required', 'string', 'confirmed', 'min:8', new StrongPassword],
                    'type' => ['required', Rule::in($this->assignableTypes())],
                    'is_active' => ['boolean'],
                    'companies' => [$company ? 'required' : 'sometimes', 'array'],
                    'companies.*' => ['integer', 'distinct', Rule::exists('companies', 'id')],
                    'permissions' => ['array'],
                    'permissions.*' => ['array:list,view,create,edit,delete,module_id'],
                    'permissions.*.list' => ['boolean'],
                    'permissions.*.view' => ['boolean'],
                    'permissions.*.create' => ['boolean'],
                    'permissions.*.edit' => ['boolean'],
                    'permissions.*.delete' => ['boolean'],
                ]);
                $ids = array_map('intval', $data['companies'] ?? []);
                abort_if($company && $ids !== [$company], 403);
                if ($company) {
                    $this->assertDelegable($data['permissions'] ?? []);
                }
                $identity = [
                    'name' => $data['name'], 'email' => $data['email'],
                    'type' => $data['type'], 'is_active' => $request->boolean('is_active'),
                ];
                $notify = $identity['is_active'] && (!$target || !$user->is_active);
                $user->fill($identity);
                abort_if($shared && ($user->isDirty() || $request->filled('password')), 403);
                if ($request->filled('password')) {
                    $user->password = Hash::make($data['password']);
                }
                $user->save();
                if (!$company || !$target) {
                    $user->companies()->sync(array_fill_keys($ids, ['role' => 'user']));
                }
                $this->syncModulePermissionsFromRequest($request, $user);
                return [$user, $notify];
            });
        } catch (ValidationException|HttpExceptionInterface|\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('Falha ao gravar conta de usuário', [
                'actor_id' => $request->user()->id, 'target_id' => $target?->id,
                'exception_class' => $e::class,
            ]);
            return back()->withErrors(['error' => 'Não foi possível salvar a conta.']);
        }
        if ($notify) {
            $this->sendWelcomeEmail($user);
        }
        return redirect()->route('admin.users.index')->with('success', 'Conta salva.');
    }

    public function destroy(User $user)
    {
        return DB::transaction(function () use ($user) {
            $user = $this->managedUser($user, true);
            abort_if($this->sharedIdentity($user, $this->localCompany()), 403);
            if (auth()->id() === $user->id) {
                return back()->with('error', 'Você não pode excluir a si mesmo.');
            }
            ModulePermission::where('user_id', $user->id)->delete();
            $user->delete();
            return redirect()->route('admin.users.index')->with('success', 'Usuário removido.');
        });
    }

    public function toggleStatus(User $user)
    {
        $user = DB::transaction(function () use ($user) {
            $user = $this->managedUser($user, true);
            abort_if($this->sharedIdentity($user, $this->localCompany()), 403);
            $user->is_active = !$user->is_active;
            $user->save();
            return $user;
        });
        if ($user->is_active) {
            $this->sendWelcomeEmail($user);
        }
        return back()->with('success', $user->is_active ? 'Usuário desbloqueado.' : 'Usuário bloqueado.');
    }

    public function resetTwoFactor(Request $request, User $user)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = DB::transaction(function () use ($request, $user) {
            $user = $this->managedUser($user, true);
            abort_if($request->user()->is($user), 422, 'Use o seu próprio perfil para alterar o 2FA.');

            $wasEnabled = (bool) $user->google2fa_enabled;
            $user->forceFill([
                'google2fa_secret' => null,
                'google2fa_enabled' => false,
                'two_factor_confirmed_at' => null,
                'two_factor_recovery_codes' => null,
            ])->save();

            DB::table('sessions')->where('user_id', $user->id)->delete();

            log_activity('two_factor_admin_reset', [
                'module' => 'user-security',
                'model_type' => User::class,
                'model_id' => $user->id,
                'before' => ['enabled' => $wasEnabled],
                'after' => ['enabled' => false, 'sessions_revoked' => true],
                'description' => 'Segundo fator redefinido pelo administrador.',
            ]);

            return $user;
        });

        return back()->with('success', "2FA de {$user->name} redefinido. Todas as sessões foram encerradas.");
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
        return redirect()->route('admin.users.edit', $this->managedUser($user));
    }

    protected function sendWelcomeEmail(User $user): void
    {
        try {
            Mail::to($user->email)->send(new WelcomeUserMail($user));
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
        abort_unless(in_array($request->user()->type, ['admin', 'super_admin'], true), 403);

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
