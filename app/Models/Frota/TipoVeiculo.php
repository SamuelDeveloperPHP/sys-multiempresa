<?php

namespace App\Models\Frota;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TipoVeiculo extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tipos_veiculos';
    protected $fillable = ['company_id', 'nome', 'codigo'];
}
