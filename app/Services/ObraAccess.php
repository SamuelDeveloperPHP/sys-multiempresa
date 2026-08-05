<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Fonte ÚNICA da verdade para "quais OBRAS este usuário enxerga nesta empresa".
 *
 * ============================================================================
 *  REGRA: UNIÃO — **NÃO** é override. Leia isto antes de mexer.
 * ============================================================================
 * As obras efetivas do usuário são:
 *
 *      obras de `obra_user` (vínculo direto)   ∪   obras do GRUPO de acesso dele
 *                                                  naquela empresa (`access_group_obra`)
 *
 * Isso é DIFERENTE da regra de MÓDULOS em App\Services\EffectivePermissions,
 * onde a linha de `module_permissions` do usuário VENCE POR INTEIRO sobre o
 * grupo (override). Aqui NADA vence: soma-se. Decisão do dono, imutável.
 * Não "uniformize" as duas regras achando que é bug.
 *
 * ============================================================================
 *  ATALHOS QUE LIBERAM TUDO (retornam null = SEM restrição)
 * ============================================================================
 *   1) $user->type === 'super_admin'
 *   2) `company_user.todas_obras` = true  (por usuário POR EMPRESA)
 *   3) `access_groups.todas_obras` = true (grupo do usuário naquela empresa)
 *
 * ============================================================================
 *  CONTRATO DE RETORNO
 * ============================================================================
 *   null  => SEM restrição: enxerga TODAS as obras. Quem consome (ObraScope)
 *            não deve aplicar filtro nenhum.
 *   []    => união vazia: não enxerga NENHUMA obra específica. Ainda assim
 *            continua vendo os registros com a coluna de obra NULL — essa
 *            decisão é do ObraScope, não daqui (ver ObraScope::NULL_VISIVEL).
 *   [1,7] => enxerga só essas obras (+ os NULL, idem acima).
 *
 * Usuário sem linha em `company_user` para a empresa consultada => [].
 * Ele não pertence à empresa; não há o que liberar.
 *
 * ============================================================================
 *  DETERMINISMO
 * ============================================================================
 * Nada aqui depende de sessão (CompanyContext/ObraContext) nem de Auth: a
 * empresa vem SEMPRE por parâmetro e as consultas usam query builder cru /
 * withoutGlobalScope + filtro explícito de company_id — mesmo espírito do
 * EffectivePermissions. Assim o serviço responde igual em request, tinker,
 * fila e teste.
 */
class ObraAccess
{
    /**
     * Cache por request: "userId:companyId" => null|int[].
     * Evita recalcular a cada query do ObraScope (que roda em TODO SELECT dos
     * models isolados). Invalide com flushCache() ao mexer nos vínculos.
     *
     * @var array<string, array<int>|null>
     */
    private static array $cache = [];

    /**
     * IDs de obra que o usuário enxerga na empresa.
     *
     * @return int[]|null  null = SEM restrição (todas as obras)
     */
    public function allowedObraIds(User $user, Company|int $company): ?array
    {
        $companyId = $this->companyId($company);
        $chave     = $user->id . ':' . $companyId;

        if (array_key_exists($chave, self::$cache)) {
            return self::$cache[$chave];
        }

        return self::$cache[$chave] = $this->calcular($user, $companyId);
    }

    /** O usuário enxerga esta obra específica nesta empresa? */
    public function canAccessObra(User $user, Company|int $company, int $obraId): bool
    {
        $ids = $this->allowedObraIds($user, $company);

        // null = sem restrição. Mesmo assim a obra precisa ser DA empresa —
        // senão "sem restrição" viraria um furo entre empresas.
        if ($ids === null) {
            return $this->obraPertenceAEmpresa($obraId, $this->companyId($company));
        }

        return in_array($obraId, $ids, true);
    }

    /**
     * Limpa o cache de request. Chame depois de mexer em obra_user,
     * access_group_obra, company_user.todas_obras ou access_groups.todas_obras.
     */
    public static function flushCache(): void
    {
        self::$cache = [];
    }

    // ------------------------------------------------------------------
    // Interno
    // ------------------------------------------------------------------

    /** @return int[]|null */
    private function calcular(User $user, int $companyId): ?array
    {
        // (1) Super admin não tem restrição de obra em lugar nenhum.
        if ($user->type === 'super_admin') {
            return null;
        }

        $vinculo = DB::table('company_user')
            ->where('user_id', $user->id)
            ->where('company_id', $companyId)
            ->first(['access_group_id', 'todas_obras']);

        // Não pertence à empresa: nenhuma obra específica.
        if (! $vinculo) {
            return [];
        }

        // (2) Liberação por usuário NAQUELA empresa.
        if ((bool) $vinculo->todas_obras) {
            return null;
        }

        $grupoId = $vinculo->access_group_id !== null ? (int) $vinculo->access_group_id : null;

        // (3) Liberação pelo grupo de acesso.
        if ($grupoId !== null) {
            $grupoTodas = DB::table('access_groups')
                ->where('id', $grupoId)
                ->where('company_id', $companyId) // grupo é por-empresa; confere.
                ->value('todas_obras');

            if ((bool) $grupoTodas) {
                return null;
            }
        }

        // (4) UNIÃO: obras do vínculo direto + obras do grupo.
        //
        // Ambas as pontas são restritas às obras DAQUELA empresa (join em
        // `obras`), para um vínculo antigo de outra empresa não vazar.
        // NÃO filtramos obras.deleted_at de propósito: obra arquivada continua
        // na lista, senão o histórico dela sumiria da tela de quem tinha acesso.
        $doUsuario = DB::table('obra_user')
            ->join('obras', 'obras.id', '=', 'obra_user.obra_id')
            ->where('obra_user.user_id', $user->id)
            ->where('obras.company_id', $companyId)
            ->pluck('obra_user.obra_id')
            ->all();

        $doGrupo = [];
        if ($grupoId !== null) {
            $doGrupo = DB::table('access_group_obra')
                ->join('obras', 'obras.id', '=', 'access_group_obra.obra_id')
                ->where('access_group_obra.access_group_id', $grupoId)
                ->where('obras.company_id', $companyId)
                ->pluck('access_group_obra.obra_id')
                ->all();
        }

        $ids = array_map('intval', array_merge($doUsuario, $doGrupo));

        return array_values(array_unique($ids));
    }

    private function obraPertenceAEmpresa(int $obraId, int $companyId): bool
    {
        return DB::table('obras')
            ->where('id', $obraId)
            ->where('company_id', $companyId)
            ->exists();
    }

    private function companyId(Company|int $company): int
    {
        return $company instanceof Company ? (int) $company->id : (int) $company;
    }
}
