<?php

namespace App\Models\Estoque\LeroyMerlin;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * 3º nível (folha) — é debaixo dela que entram os produtos.
 */
class LeroyCategoriaSecundaria extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'estoque_leroy_categorias_secundarias';

    protected $fillable = [
        'leroy_id',
        'categoria_principal_id',
        'categoria_primaria_id',
        'leroy_principal_id',
        'leroy_primaria_id',
        'nome',
    ];

    public function principal(): BelongsTo
    {
        return $this->belongsTo(LeroyCategoriaPrincipal::class, 'categoria_principal_id');
    }

    public function primaria(): BelongsTo
    {
        return $this->belongsTo(LeroyCategoriaPrimaria::class, 'categoria_primaria_id');
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(LeroyProduto::class, 'categoria_secundaria_id');
    }
}
