<?php

namespace App\Policies\Frota\Concerns;

use App\Helpers\CompanyContext;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

trait AuthorizesMobileOwnership
{
    protected function canMutate(
        User $user,
        Model $record,
        bool $isOwner,
        string $moduleSlug,
        string $ability,
    ): bool {
        $companyId = CompanyContext::id();

        if (! $companyId || (int) $record->getAttribute('company_id') !== $companyId) {
            return false;
        }

        return $isOwner || $user->hasModulePermission($companyId, $moduleSlug, $ability);
    }

    protected function ownsByEmail(User $user, Model $record): bool
    {
        $ownerEmail = trim((string) $record->getAttribute('user_create'));

        return $ownerEmail !== '' && strcasecmp($ownerEmail, trim((string) $user->email)) === 0;
    }

    protected function ownsByUserIdOrLegacyEmail(User $user, Model $record): bool
    {
        $ownerId = $record->getAttribute('id_user');

        if ($ownerId !== null) {
            return (int) $ownerId === (int) $user->getKey();
        }

        return $this->ownsByEmail($user, $record);
    }
}
