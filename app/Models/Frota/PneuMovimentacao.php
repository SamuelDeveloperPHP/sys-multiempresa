<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PneuMovimentacao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'pneu_movimentacoes';

    protected $fillable = [
        'company_id', 'pneu_id', 'tipo', 'veiculo_id',
        'posicao', 'posicao_anterior', 'medicao', 'medicao_tipo',
        'data', 'valor', 'fornecedor_id', 'vida_resultante',
        'observacao', 'nota_fiscal', 'arquivo', 'user_create',
    ];

    protected $casts = [
        'data'            => 'date',
        'medicao'         => 'integer',
        'valor'           => 'decimal:2',
        'vida_resultante' => 'integer',
    ];

    public function pneu()    { return $this->belongsTo(Pneu::class, 'pneu_id'); }
    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
}
