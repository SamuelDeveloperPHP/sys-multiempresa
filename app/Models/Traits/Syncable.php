<?php

namespace App\Models\Traits;

/**
 * Trait Syncable — comportamento padrao para tabelas que recebem upload do mobile.
 * Garante que os campos do contrato de sincronizacao estejam sempre presentes.
 *
 * Status sync_status:
 *   0 = pendente   1 = synced
 *   2 = enviando   3 = erro
 *   99 = abandonado
 */
trait Syncable
{
    /** Campos comuns a TODAS as tabelas sincronizaveis */
    public function getSyncCommonFillable(): array
    {
        return [
            'id_local', 'sync_status', 'data_sincronizacao',
            'sync_error', 'sync_attempts', 'synced_at',
        ];
    }

    public function isSynced(): bool
    {
        return (int) $this->sync_status === 1;
    }

    public function isPending(): bool
    {
        return in_array((int) $this->sync_status, [0, 2, 3], true);
    }

    public function isAbandoned(): bool
    {
        return (int) $this->sync_status === 99;
    }

    public function scopePendentes($q)
    {
        return $q->whereIn('sync_status', [0, 2, 3]);
    }

    public function scopeAbandonados($q)
    {
        return $q->where('sync_status', 99);
    }

    public function scopeSincronizados($q)
    {
        return $q->where('sync_status', 1);
    }
}
