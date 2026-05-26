<?php

namespace App\Models\Estoque\LeroyMerlin;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * 2º nível da hierarquia (filha de PRINCIPAL).
 */
class LeroyCategoriaPrimaria extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'estoque_leroy_categorias_primarias';

    protected $fillable = [
        'leroy_id',
        'categoria_principal_id',
        'leroy_principal_id',
        'nome',
    ];

    public function principal(): BelongsTo
    {
        return $this->belongsTo(LeroyCategoriaPrincipal::class, 'categoria_principal_id');
    }

    public function secundarias(): HasMany
    {
        return $this->hasMany(LeroyCategoriaSecundaria::class, 'categoria_primaria_id');
    }
}
