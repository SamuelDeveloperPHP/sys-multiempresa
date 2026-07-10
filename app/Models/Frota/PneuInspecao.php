<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PneuInspecao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'pneu_inspecoes';

    protected $fillable = [
        'company_id', 'pneu_id', 'veiculo_id', 'posicao',
        'data', 'sulco_mm', 'pressao_psi', 'medicao',
        'observacao', 'user_create',
    ];

    protected $casts = [
        'data'        => 'date',
        'sulco_mm'    => 'decimal:2',
        'pressao_psi' => 'decimal:2',
        'medicao'     => 'integer',
    ];

    public function pneu()    { return $this->belongsTo(Pneu::class, 'pneu_id'); }
    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
}
