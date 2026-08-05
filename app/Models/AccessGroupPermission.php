<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Permissão de módulo de um grupo de acesso (a base herdada pelos usuários).
 *
 * NÃO usa a trait Tenantable: o isolamento multiempresa vem do access_group
 * (que é Tenantable). O escopo é sempre feito por access_group_id.
 */
class AccessGroupPermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'access_group_id',
        'module_id',
        'can_list',
        'can_view',
        'can_create',
        'can_edit',
        'can_delete',
    ];

    protected $casts = [
        'can_list'   => 'boolean',
        'can_view'   => 'boolean',
        'can_create' => 'boolean',
        'can_edit'   => 'boolean',
        'can_delete' => 'boolean',
    ];

    public function group()
    {
        return $this->belongsTo(AccessGroup::class, 'access_group_id');
    }

    public function module()
    {
        return $this->belongsTo(Module::class, 'module_id');
    }
}
