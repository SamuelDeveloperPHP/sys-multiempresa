<?php

namespace App\Infrastructure\Jarvis\Security;

use App\Domain\Jarvis\Contracts\PermissionGatewayInterface;
use App\Models\User;

class DefaultPermissionGateway implements PermissionGatewayInterface
{
    /**
     * Verifica se o usuário pode acessar o módulo Jarvis.
     * Exige usuário ativo, vínculo com a empresa e concessão no módulo.
     */
    public function canAccessJarvis(User $user, ?int $companyId = null): bool
    {
        if (! $user->is_active) {
            return false;
        }

        // Verifica se o usuário pertence à empresa em contexto
        if ($companyId !== null) {
            return $user->companies()->where('companies.id', $companyId)->exists()
                && $user->hasModulePermission($companyId, 'jarvis', 'list');
        }

        return false;
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

        // Extrai o módulo-raiz da permissão (ex.: "jarvis" de "jarvis.system.healthcheck")
        $moduleSlug = explode('.', $permission)[0];

        if ($companyId !== null) {
            return $user->hasModulePermission($companyId, $moduleSlug, 'list');
        }

        return false;
    }
}
