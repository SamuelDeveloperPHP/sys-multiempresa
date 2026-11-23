<?php

namespace App\Policies\Frota;

use App\Models\Frota\VeiculoChecklistServico;
use App\Models\User;
use App\Policies\Frota\Concerns\AuthorizesMobileOwnership;

class VeiculoChecklistServicoPolicy
{
    use AuthorizesMobileOwnership;

    private const MODULE = 'frota.checklist-execucoes';

    public function view(User $user, VeiculoChecklistServico $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'view');
    }

    public function update(User $user, VeiculoChecklistServico $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'edit');
    }

    public function delete(User $user, VeiculoChecklistServico $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'delete');
    }

    public function isOwner(User $user, VeiculoChecklistServico $record): bool
    {
        return $this->ownsByUserIdOrLegacyEmail($user, $record);
    }
}
