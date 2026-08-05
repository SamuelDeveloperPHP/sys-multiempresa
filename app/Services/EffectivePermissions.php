<?php

namespace App\Services;

use App\Models\AccessGroupPermission;
use App\Models\Company;
use App\Models\ModulePermission;
use App\Models\Scopes\CompanyScope;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Fonte ÚNICA da verdade para permissões efetivas de módulo.
 *
 * Regra de precedência (decisão do dono, imutável):
 *   1) OVERRIDE por usuário: se existe uma linha em `module_permissions` para
 *      (empresa, usuário, módulo), ela VENCE POR INTEIRO — usamos o can_{ability}
 *      dessa linha e ignoramos o grupo para aquele módulo.
 *   2) HERANÇA de grupo: sem override, usamos o access_group do usuário naquela
 *      empresa (pivot company_user.access_group_id) e a linha correspondente em
 *      `access_group_permissions`.
 *   3) Sem override e sem grupo (ou grupo sem a linha) => false.
 *
 * RETROCOMPAT: um usuário SEM grupo (access_group_id null) que possui
 * `module_permissions` cai sempre no passo (1) e, quando não há linha, em (3) =>
 * comportamento IDÊNTICO ao legado (linha existe? usa can_x : nega).
 *
 * As consultas usam withoutGlobalScope(CompanyScope) e filtram company_id
 * explicitamente, para o serviço ser determinístico independente da empresa
 * corrente na sessão (importante para testes/tinker e para chamadas cruzadas).
 */
class EffectivePermissions
{
    /**
     * Permissão efetiva booleana para (usuário, empresa, módulo, habilidade).
     *
     * @param  string  $ability  'list' | 'view' | 'create' | 'edit' | 'delete'
     *                            (também aceita o prefixo, ex.: 'can_list').
     */
    public function can(User $user, Company|int $company, int $moduleId, string $ability): bool
    {
        // Super admin enxerga tudo (espelha User::hasModulePermission e o bypass
        // que os middlewares já fazem antes de chamar o serviço).
        if ($user->type === 'super_admin') {
            return true;
        }

        $column    = 'can_' . $this->normalizeAbility($ability);
        $companyId = $this->companyId($company);

        // (1) Override por usuário — vence por inteiro.
        $override = ModulePermission::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $companyId)
            ->where('user_id', $user->id)
            ->where('module_id', $moduleId)
            ->first();

        if ($override) {
            return (bool) $override->{$column};
        }

        // (2) Herança do grupo do usuário nessa empresa.
        $groupId = $this->userGroupId($user->id, $companyId);
        if (!$groupId) {
            return false; // (3)
        }

        $perm = AccessGroupPermission::where('access_group_id', $groupId)
            ->where('module_id', $moduleId)
            ->first();

        return $perm ? (bool) $perm->{$column} : false; // (3)
    }

    /**
     * IDs de módulos com can_list EFETIVO = true — usado para montar o menu.
     *
     * Respeita a mesma precedência: override vence por inteiro; onde não há
     * override, herda do grupo.
     *
     * Obs.: não trata super_admin aqui (os chamadores já dão bypass total no
     * menu). Se chamado para super_admin, retorna apenas o conjunto efetivo
     * calculado — os chamadores não devem depender disso.
     *
     * @return int[]  lista de module_id
     */
    public function listableModuleIds(User $user, Company|int $company): array
    {
        $companyId = $this->companyId($company);

        // Overrides do usuário nessa empresa (module_id => can_list).
        $overrides = ModulePermission::withoutGlobalScope(CompanyScope::class)
            ->where('company_id', $companyId)
            ->where('user_id', $user->id)
            ->get(['module_id', 'can_list']);

        $overrideModuleIds = $overrides->pluck('module_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $listable = [];

        // Override vence por inteiro: a linha decide o can_list do módulo.
        foreach ($overrides as $ov) {
            if ((bool) $ov->can_list) {
                $listable[(int) $ov->module_id] = true;
            }
        }

        // Herança do grupo, apenas onde NÃO há override.
        $groupId = $this->userGroupId($user->id, $companyId);
        if ($groupId) {
            $groupPerms = AccessGroupPermission::where('access_group_id', $groupId)
                ->where('can_list', true)
                ->pluck('module_id');

            foreach ($groupPerms as $moduleId) {
                $moduleId = (int) $moduleId;
                if (!in_array($moduleId, $overrideModuleIds, true)) {
                    $listable[$moduleId] = true;
                }
            }
        }

        return array_keys($listable);
    }

    /**
     * access_group_id do usuário na empresa (pivot company_user), ou null.
     */
    public function userGroupId(int $userId, int $companyId): ?int
    {
        $value = DB::table('company_user')
            ->where('user_id', $userId)
            ->where('company_id', $companyId)
            ->value('access_group_id');

        return $value !== null ? (int) $value : null;
    }

    private function companyId(Company|int $company): int
    {
        return $company instanceof Company ? (int) $company->id : (int) $company;
    }

    /** Aceita 'list' ou 'can_list' e devolve 'list'. */
    private function normalizeAbility(string $ability): string
    {
        return str_starts_with($ability, 'can_') ? substr($ability, 4) : $ability;
    }
}
