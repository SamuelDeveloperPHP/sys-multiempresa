<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pneu extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'pneus';

    protected $fillable = [
        'company_id', 'numero_fogo', 'dot', 'marca', 'modelo', 'medida',
        'desenho', 'tipo', 'vida_atual', 'valor_compra', 'data_compra',
        'nota_fiscal', 'fornecedor_id', 'situacao', 'sulco_novo_mm',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'vida_atual'    => 'integer',
        'valor_compra'  => 'decimal:2',
        'sulco_novo_mm' => 'decimal:2',
        'data_compra'   => 'date',
    ];

    public function movimentacoes() { return $this->hasMany(PneuMovimentacao::class, 'pneu_id'); }
    public function inspecoes()     { return $this->hasMany(PneuInspecao::class, 'pneu_id'); }

    /** Ultima movimentacao (evento mais recente do ledger). */
    public function ultimaMovimentacao()
    {
        return $this->hasOne(PneuMovimentacao::class, 'pneu_id')->latestOfMany('data');
    }

    /** Ultima inspecao (p/ sulco/pressao atuais). */
    public function ultimaInspecao()
    {
        return $this->hasOne(PneuInspecao::class, 'pneu_id')->latestOfMany('data');
    }
}
