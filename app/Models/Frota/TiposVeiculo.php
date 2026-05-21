<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TiposVeiculo extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'tipos_veiculos';

    protected $fillable = ['company_id', 'nome', 'codigo'];
}
