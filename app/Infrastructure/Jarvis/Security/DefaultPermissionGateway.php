<?php

namespace App\Infrastructure\Jarvis\Security;

use App\Domain\Jarvis\Contracts\PermissionGatewayInterface;
use App\Models\User;

class DefaultPermissionGateway implements PermissionGatewayInterface
{
    /**
     * Verifica se o usuário pode acessar o módulo Jarvis.
     * Regras: usuário ativo e (super_admin OU pertence à empresa).
     */
    public function canAccessJarvis(User $user, ?int $companyId = null): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($user->type === 'super_admin') {
            return true;
        }

        // Verifica se o usuário pertence à empresa em contexto
        if ($companyId !== null) {
            return $user->companies()->where('companies.id', $companyId)->exists();
        }

        return true;
    }

    /**
     * Verifica se o usuário pode executar uma tool específica.
     *
     * A string de permissão segue o padrão "módulo.submodulo.ação"
     * (ex.: "jarvis.system.healthcheck").
     * O segmento inicial é mapeado como slug do módulo no ACL.
     */
    public function canExecuteTool(User $user, string $permission, ?int $companyId = null): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($user->type === 'super_admin') {
            return true;
        }

        // Extrai o módulo-raiz da permissão (ex.: "jarvis" de "jarvis.system.healthcheck")
        $moduleSlug = explode('.', $permission)[0];

        if ($companyId !== null) {
            return $user->hasModulePermission($companyId, $moduleSlug, 'list');
        }

        // Sem company_id em contexto: permite para usuários ativos autenticados
        return true;
    }
}
