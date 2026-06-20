<?php

namespace App\Models\Estoque;

use App\Models\Fornecedor;
use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Lote de EPI/calçado/EPC/uniforme — criado em cada ENTRADA, com CA, número
 * do lote, validade e quantidade. A saída (FEFO) decrementa quantidade_atual.
 *
 * Ver migration create_estoque_lotes_table.
 */
class Lote extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'estoque_lotes';

    protected $fillable = [
        'company_id', 'produto_id', 'variante_id', 'obra_id',
        'numero_ca', 'numero_lote', 'validade', 'especificacao_tecnica',
        'fornecedor_id', 'valor_unitario',
        'quantidade_inicial', 'quantidade_atual',
        'data_entrada', 'movimentacao_entrada_id',
    ];

    protected $casts = [
        'validade'           => 'date',
        'data_entrada'       => 'date',
        'valor_unitario'     => 'decimal:2',
        'quantidade_inicial' => 'decimal:3',
        'quantidade_atual'   => 'decimal:3',
    ];

    public function produto(): BelongsTo    { return $this->belongsTo(Produto::class, 'produto_id'); }
    public function variante(): BelongsTo   { return $this->belongsTo(ProdutoVariante::class, 'variante_id'); }
    public function obra(): BelongsTo        { return $this->belongsTo(Obra::class, 'obra_id'); }
    public function fornecedor(): BelongsTo { return $this->belongsTo(Fornecedor::class, 'fornecedor_id'); }
    public function movimentacaoEntrada(): BelongsTo
    {
        return $this->belongsTo(Movimentacao::class, 'movimentacao_entrada_id');
    }

    /** Lotes com saldo > 0. */
    public function scopeComSaldo(Builder $q): Builder
    {
        return $q->where('quantidade_atual', '>', 0);
    }

    /** Ordem FEFO: vence primeiro primeiro (validade asc; nulos por último). */
    public function scopeFefo(Builder $q): Builder
    {
        return $q->orderByRaw('validade IS NULL, validade ASC')->orderBy('id');
    }

    /** Dias até vencer (negativo = vencido). Null se sem validade. */
    public function getDiasParaVencerAttribute(): ?int
    {
        if (!$this->validade) return null;
        return (int) now()->startOfDay()->diffInDays($this->validade, false);
    }
}
