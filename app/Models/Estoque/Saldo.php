<?php

namespace App\Models\Estoque;

use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Saldo denormalizado de cada (produto × obra).
 *
 * Atualizado automaticamente pelo Observer
 * App\Observers\MovimentacaoObserver.
 *
 * NUNCA atualize esta tabela direto sem passar por uma Movimentacao —
 * caso contrário o histórico fica inconsistente. Para corrigir, use
 * AJUSTE_INVENTARIO (que registra movimentação E ajusta saldo juntos).
 */
class Saldo extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'estoque_saldos';

    protected $fillable = [
        'company_id', 'produto_id', 'variante_id', 'obra_id',
        'quantidade', 'valor_medio',
        'ultima_movimentacao_at',
    ];

    protected $casts = [
        'quantidade'              => 'decimal:3',
        'valor_medio'             => 'decimal:2',
        'ultima_movimentacao_at'  => 'datetime',
    ];

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProdutoVariante::class, 'variante_id');
    }

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class);
    }

    /**
     * Está abaixo do mínimo definido no produto?
     */
    public function getAbaixoMinimoAttribute(): bool
    {
        return (float) $this->quantidade < (float) ($this->produto->estoque_minimo ?? 0);
    }

    /**
     * Valor total deste saldo (qtd × PMP).
     */
    public function getValorTotalAttribute(): float
    {
        return (float) $this->quantidade * (float) $this->valor_medio;
    }
}
