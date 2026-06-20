<?php

namespace App\Models\Estoque;

use App\Models\Fornecedor;
use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Movimentação de estoque. Fonte da verdade — o Saldo é derivado daqui.
 */
class Movimentacao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'estoque_movimentacoes';

    // Tipos
    public const TIPO_ENTRADA     = 'ENTRADA';
    public const TIPO_SAIDA       = 'SAIDA';
    public const TIPO_TRANSF_OUT  = 'TRANSF_OUT';
    public const TIPO_TRANSF_IN   = 'TRANSF_IN';
    public const TIPO_AJUSTE_INV  = 'AJUSTE_INVENTARIO';
    public const TIPO_DEVOLUCAO   = 'DEVOLUCAO';

    public const TIPOS_ENTRADA = [self::TIPO_ENTRADA, self::TIPO_TRANSF_IN, self::TIPO_DEVOLUCAO];
    public const TIPOS_SAIDA   = [self::TIPO_SAIDA, self::TIPO_TRANSF_OUT];
    public const TIPOS_AJUSTE  = [self::TIPO_AJUSTE_INV];

    protected $fillable = [
        'company_id', 'produto_id', 'variante_id', 'lote_id', 'obra_id', 'tipo',
        'quantidade', 'valor_unitario', 'valor_total',
        'data_movimento', 'observacao',
        'fornecedor_id', 'nota_fiscal', 'data_nota_fiscal',
        'obra_contraparte_id', 'movimentacao_par_id',
        'requisicao_id', 'requisicao_item_id', 'inventario_id',
        'user_create', 'user_edit',
        // Validação / auditoria de saída e devolução (FASE 7)
        'retirante_user_id', 'retirante_funcionario_id',
        'validacao_method', 'validado_em',
        'movimentacao_origem_id',
    ];

    protected $casts = [
        'data_movimento'    => 'date',
        'data_nota_fiscal'  => 'date',
        'quantidade'        => 'decimal:3',
        'valor_unitario'    => 'decimal:2',
        'valor_total'       => 'decimal:2',
        'validado_em'       => 'datetime',
    ];

    public function produto(): BelongsTo       { return $this->belongsTo(Produto::class); }
    public function variante(): BelongsTo      { return $this->belongsTo(ProdutoVariante::class, 'variante_id'); }
    public function lote(): BelongsTo          { return $this->belongsTo(Lote::class, 'lote_id'); }
    public function obra(): BelongsTo          { return $this->belongsTo(Obra::class); }
    public function obraContraparte(): BelongsTo { return $this->belongsTo(Obra::class, 'obra_contraparte_id'); }
    public function fornecedor(): BelongsTo    { return $this->belongsTo(Fornecedor::class); }
    public function par(): BelongsTo           { return $this->belongsTo(self::class, 'movimentacao_par_id'); }
    public function origem(): BelongsTo        { return $this->belongsTo(self::class, 'movimentacao_origem_id'); }
    public function retirante(): BelongsTo     { return $this->belongsTo(\App\Models\User::class, 'retirante_user_id'); }
    public function retiranteFuncionario(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Funcionario::class, 'retirante_funcionario_id');
    }

    /**
     * Devoluções (registros DEVOLUCAO em estoque_movimentacoes) que apontam
     * para esta movimentação como origem.
     */
    public function devolucoesFeitas()
    {
        return $this->hasMany(self::class, 'movimentacao_origem_id')
            ->where('tipo', self::TIPO_DEVOLUCAO);
    }
    public function requisicao(): BelongsTo    { return $this->belongsTo(Requisicao::class); }
    public function inventario(): BelongsTo    { return $this->belongsTo(Inventario::class); }

    /**
     * Retorna +1 se a movimentação ADICIONA ao saldo, -1 se SUBTRAI,
     * ou o sinal apropriado para AJUSTE (depende de diferença salva).
     */
    public function getSinalAttribute(): int
    {
        if (in_array($this->tipo, self::TIPOS_ENTRADA, true)) return 1;
        if (in_array($this->tipo, self::TIPOS_SAIDA, true))   return -1;
        // Ajuste pode ser positivo OU negativo — depende do valor da quantidade.
        // No nosso schema, quantidade é sempre positiva. Para ajuste negativo,
        // o caller passa `quantidade = abs(diff)` e tipo separado a definir.
        // (Por simplicidade do MVP, ajustes positivos por enquanto.)
        return 1;
    }

    /**
     * Delta efetivo aplicado ao saldo: quantidade × sinal.
     */
    public function getDeltaAttribute(): float
    {
        return (float) $this->quantidade * $this->sinal;
    }
}
