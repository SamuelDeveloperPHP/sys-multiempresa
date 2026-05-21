<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarcaMaquina extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'marca_maquinas';

    protected $fillable = ['company_id', 'marca', 'user_create'];

    public function modelos()
    {
        return $this->hasMany(ModeloMaquina::class, 'marca_id');
    }
}
