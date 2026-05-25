<?php

namespace App\Models\Estoque;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Categoria de produto. Árvore via parent_id.
 *
 * Substitui os 3 níveis fixos do legado (principal/primaria/secundaria) por
 * uma estrutura recursiva. O atributo legacy_kind preserva qual era o tipo
 * original (após o ETL).
 */
class Categoria extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'estoque_categorias';

    protected $fillable = [
        'company_id', 'parent_id',
        'nome', 'slug', 'descricao',
        'ordem', 'ativo',
        'legacy_kind', 'legacy_id',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'ordem' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('ordem')->orderBy('nome');
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class, 'categoria_id');
    }

    /**
     * Caminho completo da categoria (ex: "Construção > Tijolos > Furados").
     */
    public function caminho(string $separador = ' > '): string
    {
        $parts = [$this->nome];
        $node = $this->parent;
        while ($node) {
            array_unshift($parts, $node->nome);
            $node = $node->parent;
        }
        return implode($separador, $parts);
    }
}
