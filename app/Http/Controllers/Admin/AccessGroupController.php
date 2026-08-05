<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\AccessGroup;
use App\Models\AccessGroupPermission;
use App\Models\Module;
use App\Models\Obra;
use App\Models\Scopes\CompanyScope;
use App\Services\ObraAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Throwable;

/**
 * CRUD de Grupos de Acesso (Níveis de Acesso), escopados por empresa.
 *
 * Isolamento multiempresa: AccessGroup usa a trait Tenantable (CompanyScope
 * global + company_id automático na criação). Assim, index/binding/creation já
 * ficam presos à empresa corrente (CompanyContext). Ainda assim reforçamos a
 * checagem de empresa de forma defensiva.
 *
 * NÃO monta telas React — apenas devolve as props para o Frontend construir.
 */
class AccessGroupController extends Controller
{
    public function index()
    {
        try {
            $company = CompanyContext::current();
            if (!$company) {
                abort(403, 'Empresa não selecionada.');
            }

            // CompanyScope (Tenantable) já filtra por company_id automaticamente.
            $groups = AccessGroup::query()
                ->withCount(['permissions', 'users'])
                ->orderBy('name')
                ->get(['id', 'company_id', 'name', 'descricao', 'created_at', 'updated_at']);

            return Inertia::render('Admin/AccessGroups/Index', [
                'groups'  => $groups,
                'company' => $company->only(['id', 'name']),
            ]);
        } catch (Throwable $e) {
            return $this->fail('listar grupos de acesso', $e);
        }
    }

    public function create()
    {
        try {
            $company = CompanyContext::current();
            if (!$company) {
                abort(403, 'Empresa não selecionada.');
            }

            return Inertia::render('Admin/AccessGroups/Create', [
                'company'        => $company->only(['id', 'name']),
                'groupedModules' => $this->groupedModules(),
                // Obras da empresa para o multiselect. Grupo novo nasce RESTRITO
                // (todas_obras = false) e sem obra nenhuma.
                'obras'          => $this->obrasDaEmpresa((int) $company->id),
            ]);
        } catch (Throwable $e) {
            return $this->fail('carregar formulário de grupo de acesso', $e);
        }
    }

    public function store(Request $request)
    {
        try {
            $company = CompanyContext::current();
            if (!$company) {
                abort(403, 'Empresa não selecionada.');
            }

            $data = $request->validate([
                'name' => [
                    'required', 'string', 'max:255',
                    // Nome único DENTRO da empresa corrente.
                    Rule::unique('access_groups', 'name')
                        ->where(fn ($q) => $q->where('company_id', $company->id)),
                ],
                'descricao'                => 'nullable|string|max:255',
                'permissions'              => 'array',
                'permissions.*.module_id'  => 'nullable|integer|exists:modules,id',

                // Isolamento por obra
                'todas_obras' => 'boolean',
                'obra_ids'    => 'array',
                'obra_ids.*'  => 'integer',
            ]);

            // Valida ANTES de criar: nenhuma obra de outra empresa pode entrar.
            $obraIds = $this->assertObrasBelongToCompany($request, (int) $company->id);

            // company_id é preenchido automaticamente pela trait Tenantable.
            // Transação: se o sync de permissões/obras falhar (ex.: FK), desfaz a
            // criação do grupo — evita grupo órfão vazio.
            DB::transaction(function () use ($request, $data, $obraIds) {
                $group = AccessGroup::create([
                    'name'        => $data['name'],
                    'descricao'   => $data['descricao'] ?? null,
                    'todas_obras' => $request->boolean('todas_obras'),
                ]);

                $this->syncGroupPermissionsFromRequest($request, $group);
                $group->obras()->sync($obraIds);
            });

            ObraAccess::flushCache();

            return redirect()
                ->route('admin.users.permissions.index')
                ->with('success', 'Grupo de acesso criado com sucesso.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            return $this->fail('criar grupo de acesso', $e, true);
        }
    }

    public function edit(AccessGroup $accessGroup)
    {
        try {
            $company = CompanyContext::current();
            if (!$company || (int) $accessGroup->company_id !== (int) $company->id) {
                abort(403, 'Grupo de acesso não pertence à empresa atual.');
            }

            // module_id => linha de permissão do grupo (para pré-marcar a matriz).
            $permissions = $accessGroup->permissions()
                ->get()
                ->keyBy('module_id');

            return Inertia::render('Admin/AccessGroups/Edit', [
                'group'          => $accessGroup->only(['id', 'name', 'descricao', 'todas_obras']),
                'company'        => $company->only(['id', 'name']),
                'groupedModules' => $this->groupedModules(),
                'permissions'    => $permissions,
                'obras'          => $this->obrasDaEmpresa((int) $company->id),
                // Obras já marcadas. Lidas direto do pivot (sem passar pelo model
                // Obra) para não sofrerem CompanyScope nem SoftDeletes: a obra
                // arquivada continua marcada no form, senão o save a apagaria.
                'groupObraIds'   => DB::table('access_group_obra')
                    ->where('access_group_id', $accessGroup->id)
                    ->pluck('obra_id')
                    ->map(fn ($id) => (int) $id)
                    ->values(),
            ]);
        } catch (Throwable $e) {
            return $this->fail('carregar edição de grupo de acesso', $e);
        }
    }

    public function update(Request $request, AccessGroup $accessGroup)
    {
        try {
            $company = CompanyContext::current();
            if (!$company || (int) $accessGroup->company_id !== (int) $company->id) {
                abort(403, 'Grupo de acesso não pertence à empresa atual.');
            }

            $data = $request->validate([
                'name' => [
                    'required', 'string', 'max:255',
                    Rule::unique('access_groups', 'name')
                        ->where(fn ($q) => $q->where('company_id', $company->id))
                        ->ignore($accessGroup->id),
                ],
                'descricao'                => 'nullable|string|max:255',
                'permissions'              => 'array',
                'permissions.*.module_id'  => 'nullable|integer|exists:modules,id',

                // Isolamento por obra
                'todas_obras' => 'boolean',
                'obra_ids'    => 'array',
                'obra_ids.*'  => 'integer',
            ]);

            $obraIds = $this->assertObrasBelongToCompany($request, (int) $company->id);

            DB::transaction(function () use ($request, $data, $accessGroup, $obraIds) {
                $accessGroup->update([
                    'name'        => $data['name'],
                    'descricao'   => $data['descricao'] ?? null,
                    'todas_obras' => $request->boolean('todas_obras'),
                ]);

                $this->syncGroupPermissionsFromRequest($request, $accessGroup);
                $accessGroup->obras()->sync($obraIds);
            });

            // O cálculo de obras efetivas é cacheado por request no ObraAccess.
            ObraAccess::flushCache();

            return redirect()
                ->route('admin.users.permissions.index')
                ->with('success', 'Grupo de acesso atualizado com sucesso.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            return $this->fail('atualizar grupo de acesso', $e, true);
        }
    }

    public function destroy(AccessGroup $accessGroup)
    {
        try {
            $company = CompanyContext::current();
            if (!$company || (int) $accessGroup->company_id !== (int) $company->id) {
                abort(403, 'Grupo de acesso não pertence à empresa atual.');
            }

            // access_group_permissions caem por cascade; company_user.access_group_id
            // volta a null por nullOnDelete (usuários perdem a herança, mantêm overrides).
            $accessGroup->delete();

            return redirect()
                ->route('admin.users.permissions.index')
                ->with('success', 'Grupo de acesso removido.');
        } catch (Throwable $e) {
            return $this->fail('remover grupo de acesso', $e);
        }
    }

    /**
     * Módulos ativos agrupados por módulo base (parent_id ?: id) — MESMO formato
     * usado pelo UserController, para o Frontend montar a matriz de permissões.
     */
    protected function groupedModules()
    {
        $modules = Module::query()
            ->active()
            ->orderBy('ordem')
            ->orderBy('name')
            ->get();

        return $modules->groupBy(fn ($module) => $module->parent_id ?: $module->id);
    }

    /**
     * Obras da empresa, para o multiselect do form.
     *
     * Lista TODAS as obras da empresa de propósito: quem está montando o grupo é
     * o admin, e ele precisa poder atribuir qualquer obra — inclusive as que ele
     * próprio não enxerga. Por isso NÃO se usa ObraContext::userObras() aqui.
     * (O model Obra não é ObraScoped justamente por causa desta tela.)
     */
    protected function obrasDaEmpresa(int $companyId)
    {
        return Obra::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $companyId)
            ->orderBy('nome_fantasia')
            ->get(['id', 'nome_fantasia', 'codigo_obra']);
    }

    /**
     * Valida que TODA obra enviada pertence à empresa do grupo e devolve a lista
     * já normalizada em int. Mesmo papel do assertAccessGroupsBelong do
     * UserController: barrar payload adulterado que tente vincular obra de outra
     * empresa (seria um furo de isolamento multiempresa).
     *
     * @return int[]
     */
    protected function assertObrasBelongToCompany(Request $request, int $companyId): array
    {
        $obraIds = array_values(array_unique(array_map(
            'intval',
            $request->input('obra_ids', []) ?: []
        )));

        if (empty($obraIds)) {
            return [];
        }

        $validas = Obra::withoutGlobalScope(CompanyScope::class)
            ->whereIn('id', $obraIds)
            ->where('company_id', $companyId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $invalidas = array_diff($obraIds, $validas);

        if (!empty($invalidas)) {
            throw ValidationException::withMessages([
                'obra_ids' => 'Obra inválida para esta empresa: ' . implode(', ', $invalidas) . '.',
            ]);
        }

        return $obraIds;
    }

    /**
     * Lê as checkboxes (permissions[module_id][list|view|create|edit|delete]) e
     * sincroniza as linhas de access_group_permissions do grupo.
     *
     * Sem nenhuma habilidade marcada num módulo => remove a linha (herança "não
     * concede"). Estrutura idêntica à do UserController::syncModulePermissions.
     */
    protected function syncGroupPermissionsFromRequest(Request $request, AccessGroup $group): void
    {
        $permissionsInput = $request->input('permissions', []); // [module_id => [list, view, ...]]

        if (empty($permissionsInput)) {
            $group->permissions()->delete();
            return;
        }

        foreach ($permissionsInput as $moduleId => $perm) {
            $moduleId = (int) $moduleId;

            $canList   = !empty($perm['list']);
            $canView   = !empty($perm['view']);
            $canCreate = !empty($perm['create']);
            $canEdit   = !empty($perm['edit']);
            $canDelete = !empty($perm['delete']);

            $hasAny = $canList || $canView || $canCreate || $canEdit || $canDelete;

            if (!$hasAny) {
                AccessGroupPermission::where('access_group_id', $group->id)
                    ->where('module_id', $moduleId)
                    ->delete();
                continue;
            }

            AccessGroupPermission::updateOrCreate(
                [
                    'access_group_id' => $group->id,
                    'module_id'       => $moduleId,
                ],
                [
                    'can_list'   => $canList,
                    'can_view'   => $canView,
                    'can_create' => $canCreate,
                    'can_edit'   => $canEdit,
                    'can_delete' => $canDelete,
                ]
            );
        }
    }

    /** Log + resposta de erro no mesmo padrão dos demais controllers admin. */
    protected function fail(string $acao, Throwable $e, bool $withInput = false)
    {
        Log::error("Erro ao {$acao}", [
            'msg'   => $e->getMessage(),
            'file'  => $e->getFile(),
            'line'  => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);

        $short = mb_substr($e->getMessage(), 0, 120);
        $back  = back();

        if ($withInput) {
            $back = $back->withInput();
        }

        return $back->withErrors([
            'error' => "Falha ao {$acao}. Erro: {$short} (linha {$e->getLine()})",
        ]);
    }
}
