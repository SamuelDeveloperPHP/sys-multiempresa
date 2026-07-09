<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoSeguro extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_seguros';

    protected $fillable = [
        'company_id', 'veiculo_id',
        'nome_seguradora', 'carencia_inicial', 'carencia_final', 'valor', 'arquivo',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'valor'            => 'decimal:2',
        'carencia_inicial' => 'date',
        'carencia_final'   => 'date',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
}
