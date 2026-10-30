<?php

namespace App\Policies\Frota;

use App\Models\Frota\VeiculoAbastecimento;
use App\Models\User;
use App\Policies\Frota\Concerns\AuthorizesMobileOwnership;

class VeiculoAbastecimentoPolicy
{
    use AuthorizesMobileOwnership;

    private const MODULE = 'frota.abastecimentos';

    public function update(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->canMutate($user, $record, $this->isOwner($user, $record), self::MODULE, 'edit');
    }

    public function delete(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->canMutate($user, $record, $this->isOwner($user, $record), self::MODULE, 'delete');
    }

    public function isOwner(User $user, VeiculoAbastecimento $record): bool
    {
        return $this->ownsByEmail($user, $record);
    }
}
