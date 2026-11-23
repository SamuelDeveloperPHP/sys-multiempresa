<?php

namespace App\Policies\Frota;

use App\Models\Frota\VeiculoDiarioBordo;
use App\Models\User;
use App\Policies\Frota\Concerns\AuthorizesMobileOwnership;

class VeiculoDiarioBordoPolicy
{
    use AuthorizesMobileOwnership;

    private const MODULE = 'frota.diario';

    public function view(User $user, VeiculoDiarioBordo $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'view');
    }

    public function update(User $user, VeiculoDiarioBordo $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'edit');
    }

    public function delete(User $user, VeiculoDiarioBordo $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'delete');
    }

    public function isOwner(User $user, VeiculoDiarioBordo $record): bool
    {
        return $this->ownsByUserIdOrLegacyEmail($user, $record);
    }
}
