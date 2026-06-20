<?php

namespace App\Models\Tcpo;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Categoria/EAP do TCPO. Árvore via parent_id.
 *
 * CATÁLOGO GLOBAL: compartilhado entre todas as empresas (sem company_id).
 * Idempotência no ETL via (base, legacy_path).
 */
class TcpoCategoria extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tcpo_categorias';

    protected $fillable = [
        'parent_id', 'base', 'codigo', 'nome',
        'nivel', 'ordem', 'legacy_path',
    ];

    protected $casts = [
        'nivel' => 'integer',
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

    public function composicoes(): HasMany
    {
        return $this->hasMany(TcpoComposicao::class, 'categoria_id');
    }

    /** Caminho completo (ex.: "06 Alvenarias > Alvenaria de vedação"). */
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
