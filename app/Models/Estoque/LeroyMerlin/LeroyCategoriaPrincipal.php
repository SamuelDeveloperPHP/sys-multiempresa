<?php

namespace App\Models\Estoque\LeroyMerlin;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Categoria PRINCIPAL (raiz da hierarquia) do catálogo Leroy Merlin.
 *
 * Catálogo é global (não multi-tenant) — é referência de mercado.
 */
class LeroyCategoriaPrincipal extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'estoque_leroy_categorias_principais';

    protected $fillable = ['leroy_id', 'nome'];

    public function primarias(): HasMany
    {
        return $this->hasMany(LeroyCategoriaPrimaria::class, 'categoria_principal_id');
    }

    public function secundarias(): HasMany
    {
        return $this->hasMany(LeroyCategoriaSecundaria::class, 'categoria_principal_id');
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(LeroyProduto::class, 'categoria_principal_id');
    }
}
