<?php

namespace App\Domain\Jarvis\Contracts;

use App\Models\User;

interface PermissionGatewayInterface
{
    public function canAccessJarvis(User $user, ?int $companyId = null): bool;
    public function canExecuteTool(User $user, string $permission, ?int $companyId = null): bool;
}
