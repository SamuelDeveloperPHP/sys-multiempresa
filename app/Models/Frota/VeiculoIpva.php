<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoIpva extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_ipvas';

    protected $fillable = [
        'company_id', 'veiculo_id',
        'referencia_ano', 'valor',
        'data_de_vencimento', 'data_de_pagamento',
        'nome_anexo_ipva', 'extensao',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'valor'              => 'decimal:2',
        'data_de_vencimento' => 'date',
        'data_de_pagamento'  => 'date',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
}
