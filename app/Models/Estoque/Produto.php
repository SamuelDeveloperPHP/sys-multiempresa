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
        'company_id', 'categoria_id', 'tipo_item', 'controla_variacao',
        'fornecedor_padrao_id',
        'sku', 'codigo_barras', 'nome', 'marca', 'descricao',
        'unidade', 'peso_kg',
        'valor_unitario', 'valor_ultima_entrada', 'valor_referencia',
        'estoque_minimo', 'estoque_maximo',
        'imagem', 'ativo',
        'origem', 'chave_pdm', 'leroy_id_ref',
        'legacy_sku',
        'legacy_id_categoria_principal',
        'legacy_id_categoria_primaria',
        'legacy_id_categoria_secundaria',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'ativo'                 => 'boolean',
        'controla_variacao'     => 'boolean',
        'peso_kg'               => 'decimal:3',
        'valor_unitario'        => 'decimal:2',
        'valor_ultima_entrada'  => 'decimal:2',
        'valor_referencia'      => 'decimal:2',
        'estoque_minimo'        => 'decimal:3',
        'estoque_maximo'        => 'decimal:3',
    ];

    public const ORIGEM_MANUAL = 'manual';
    public const ORIGEM_LEGADO = 'legado';
    public const ORIGEM_LEROY  = 'leroy_merlin';

    // Classificações de item. 'material' = comum (sem variação).
    public const TIPO_MATERIAL          = 'material';
    public const TIPO_EPI               = 'epi';
    public const TIPO_CALCADO_SEGURANCA = 'calcado_seguranca';
    public const TIPO_EPC               = 'epc';
    public const TIPO_UNIFORME          = 'uniforme';

    public const TIPOS_ITEM = [
        self::TIPO_MATERIAL          => 'Material comum',
        self::TIPO_EPI               => 'EPI',
        self::TIPO_CALCADO_SEGURANCA => 'Calçado de segurança',
        self::TIPO_EPC               => 'EPC',
        self::TIPO_UNIFORME          => 'Uniforme',
    ];

    /** Tipos que exigem controle de lote/CA/validade na entrada (Parte 2). */
    public const TIPOS_COM_LOTE = [
        self::TIPO_EPI,
        self::TIPO_CALCADO_SEGURANCA,
        self::TIPO_EPC,
        self::TIPO_UNIFORME,
    ];

    public function isEpiOuAfins(): bool
    {
        return in_array($this->tipo_item, self::TIPOS_COM_LOTE, true);
    }

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

    public function variacoes(): HasMany
    {
        return $this->hasMany(ProdutoVariacao::class, 'produto_id')
            ->orderBy('tipo')->orderBy('ordem')->orderBy('valor');
    }

    /** Cores cadastradas (collection de strings). */
    public function cores()
    {
        return $this->variacoes->where('tipo', ProdutoVariacao::TIPO_COR)->pluck('valor')->values();
    }

    /** Tamanhos numéricos (calçados). */
    public function tamanhosNumericos()
    {
        return $this->variacoes->where('tipo', ProdutoVariacao::TIPO_TAMANHO_NUMERICO)->pluck('valor')->values();
    }

    /** Tamanhos de vestuário (P/M/G…). */
    public function tamanhosVestuario()
    {
        return $this->variacoes->where('tipo', ProdutoVariacao::TIPO_TAMANHO_VESTUARIO)->pluck('valor')->values();
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
