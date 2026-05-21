<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ModeloMaquina extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'modelo_maquinas';

    protected $fillable = ['company_id', 'marca_id', 'modelo', 'user_create'];

    public function marca()
    {
        return $this->belongsTo(MarcaMaquina::class, 'marca_id');
    }
}
