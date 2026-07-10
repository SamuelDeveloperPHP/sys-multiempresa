<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoDepreciacao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_depreciacoes';

    protected $fillable = [
        'company_id', 'veiculo_id',
        'valor_atual', 'referencia_mes', 'referencia_ano',
        'origem', 'metodo', 'valor_base', 'depreciacao_acumulada', 'memoria_calculo',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'valor_atual'           => 'decimal:2',
        'valor_base'            => 'decimal:2',
        'depreciacao_acumulada' => 'decimal:2',
        'memoria_calculo'       => 'array',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
}
