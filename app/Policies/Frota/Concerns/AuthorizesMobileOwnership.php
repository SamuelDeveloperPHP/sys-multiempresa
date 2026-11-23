<?php

namespace App\Policies\Frota\Concerns;

use App\Helpers\CompanyContext;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

trait AuthorizesMobileOwnership
{
    protected function hasRecordPermission(
        User $user,
        Model $record,
        string $moduleSlug,
        string $ability,
    ): bool {
        $companyId = CompanyContext::id();

        if (! $companyId || (int) $record->getAttribute('company_id') !== $companyId) {
            return false;
        }

        $worksite = $record->getAttribute('id_obra');

        return $user->hasModulePermission($companyId, $moduleSlug, $ability)
            && (!$worksite || $user->obrasForCompany($companyId)->whereKey($worksite)->exists());
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
