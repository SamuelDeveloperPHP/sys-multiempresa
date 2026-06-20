<?php

namespace App\Models\Estoque;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Variante = combinação concreta (cor × tamanho) de um produto, com saldo e
 * lotes próprios. Criada sob demanda na entrada de EPI.
 *
 * Ver migration create_estoque_produto_variantes_table.
 */
class ProdutoVariante extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'estoque_produto_variantes';

    protected $fillable = [
        'produto_id', 'cor', 'tamanho', 'sku_variante', 'codigo_barras', 'ativo',
    ];

    protected $casts = ['ativo' => 'boolean'];

    public function produto(): BelongsTo { return $this->belongsTo(Produto::class, 'produto_id'); }
    public function lotes(): HasMany     { return $this->hasMany(Lote::class, 'variante_id'); }
    public function saldos(): HasMany    { return $this->hasMany(Saldo::class, 'variante_id'); }

    /** Rótulo legível: "Marrom · 42" / "Marrom" / "42". */
    public function getRotuloAttribute(): string
    {
        return collect([$this->cor, $this->tamanho])->filter()->implode(' · ') ?: 'Padrão';
    }

    /**
     * Acha (ou cria) a variante de um produto para uma cor/tamanho.
     * Normaliza vazios para null para casar com a unique.
     */
    public static function firstOrCreatePara(int $produtoId, ?string $cor, ?string $tamanho): self
    {
        $cor     = ($cor !== null && trim($cor) !== '') ? trim($cor) : null;
        $tamanho = ($tamanho !== null && trim($tamanho) !== '') ? trim($tamanho) : null;

        return static::firstOrCreate(
            ['produto_id' => $produtoId, 'cor' => $cor, 'tamanho' => $tamanho],
            ['ativo' => true],
        );
    }
}
