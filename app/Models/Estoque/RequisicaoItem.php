<?php

namespace App\Models\Estoque;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequisicaoItem extends Model
{
    use HasFactory;

    protected $table = 'estoque_requisicao_itens';

    protected $fillable = [
        'requisicao_id', 'produto_id',
        'quantidade_solicitada', 'quantidade_atendida',
        'valor_unitario_estimado', 'valor_total_estimado',
        'observacao',
    ];

    protected $casts = [
        'quantidade_solicitada'   => 'decimal:3',
        'quantidade_atendida'     => 'decimal:3',
        'valor_unitario_estimado' => 'decimal:2',
        'valor_total_estimado'    => 'decimal:2',
    ];

    public function requisicao(): BelongsTo { return $this->belongsTo(Requisicao::class); }
    public function produto(): BelongsTo    { return $this->belongsTo(Produto::class); }

    /** True se ainda há saldo a atender (quantidade_atendida < solicitada). */
    public function getAtendimentoPendenteAttribute(): bool
    {
        return (float) $this->quantidade_atendida < (float) $this->quantidade_solicitada;
    }

    public function getSaldoPendenteAttribute(): float
    {
        return max(0, (float) $this->quantidade_solicitada - (float) $this->quantidade_atendida);
    }
}
