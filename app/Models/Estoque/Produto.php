<?php

namespace App\Models\Estoque;

use App\Models\Fornecedor;
use App\Models\Obra;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Produto do catálogo.
 *
 * CATÁLOGO GLOBAL: produtos são compartilhados entre todas as empresas.
 * NÃO armazena quantidade — saldo POR (produto, obra) fica em
 * App\Models\Estoque\Saldo (estoque_saldos), com company_id.
 *
 * SKU é único GLOBALMENTE.
 */
class Produto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'estoque_produtos';

    protected $fillable = [
        'company_id', 'categoria_id', 'fornecedor_padrao_id',
        'sku', 'codigo_barras', 'nome', 'marca', 'descricao',
        'unidade', 'peso_kg',
        'valor_unitario', 'valor_ultima_entrada',
        'estoque_minimo', 'estoque_maximo',
        'imagem', 'ativo',
        'legacy_sku',
        'legacy_id_categoria_principal',
        'legacy_id_categoria_primaria',
        'legacy_id_categoria_secundaria',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'ativo'                 => 'boolean',
        'peso_kg'               => 'decimal:3',
        'valor_unitario'        => 'decimal:2',
        'valor_ultima_entrada'  => 'decimal:2',
        'estoque_minimo'        => 'decimal:3',
        'estoque_maximo'        => 'decimal:3',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function fornecedorPadrao(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class, 'fornecedor_padrao_id');
    }

    public function saldos(): HasMany
    {
        return $this->hasMany(Saldo::class);
    }

    public function movimentacoes(): HasMany
    {
        return $this->hasMany(Movimentacao::class);
    }

    /**
     * Saldo deste produto numa obra específica.
     */
    public function saldoNaObra(int $obraId): ?Saldo
    {
        return $this->saldos()->where('obra_id', $obraId)->first();
    }

    /**
     * Soma o saldo de todas as obras (saldo global do produto na empresa).
     */
    public function getSaldoTotalAttribute(): float
    {
        return (float) $this->saldos()->sum('quantidade');
    }

    /**
     * Gera SKU automático se não foi informado (chamado no controller).
     * Formato: SGA-{8 chars uniqid em base36}.
     */
    public static function gerarSku(): string
    {
        return 'SGA-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }
}
