<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ModulePermission extends Model
{
    use HasFactory, \App\Models\Traits\Tenantable;

    protected $fillable = [
        'company_id',
        'user_id',
        'module_id',
        'can_list',
        'can_view',
        'can_create',
        'can_edit',
        'can_delete',
    ];

    public function module()
    {
        return $this->belongsTo(Module::class, 'module_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // public function company() provido pela trait Tenantable
}