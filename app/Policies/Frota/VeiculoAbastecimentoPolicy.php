<?php

namespace App\Policies\Frota;

use App\Models\Frota\VeiculoAbastecimento;
use App\Models\User;
use App\Policies\Frota\Concerns\AuthorizesMobileOwnership;

class VeiculoAbastecimentoPolicy
{
    use AuthorizesMobileOwnership;

    private const MODULE = 'frota.abastecimentos';

    public function view(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'view');
    }

    public function update(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'edit');
    }

    public function delete(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->hasRecordPermission($user, $record, self::MODULE, 'delete');
    }

    public function isOwner(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->ownsByEmail($user, $record);
    }
}
