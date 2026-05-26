<?php

namespace App\Models\Estoque\LeroyMerlin;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Produto do catálogo da Leroy Merlin.
 *
 * NÃO é estoque real — é referência externa. O usuário (futuramente) pode
 * importar pro seu estoque_produtos da empresa.
 */
class LeroyProduto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'estoque_leroy_produtos';

    protected $fillable = [
        'leroy_id',
        'categoria_principal_id',
        'categoria_primaria_id',
        'categoria_secundaria_id',
        'nome',
        'marca',
        'valor_unitario',
        'unidade',
        'imagem_path',
        'imagem_url_original',
        'ativo',
        'ultimo_sync_user_id',
        'ultimo_sync_at',
    ];

    protected $casts = [
        'valor_unitario' => 'decimal:2',
        'ativo'          => 'boolean',
        'ultimo_sync_at' => 'datetime',
    ];

    public function principal(): BelongsTo
    {
        return $this->belongsTo(LeroyCategoriaPrincipal::class, 'categoria_principal_id');
    }

    public function primaria(): BelongsTo
    {
        return $this->belongsTo(LeroyCategoriaPrimaria::class, 'categoria_primaria_id');
    }

    public function secundaria(): BelongsTo
    {
        return $this->belongsTo(LeroyCategoriaSecundaria::class, 'categoria_secundaria_id');
    }

    public function ultimoSyncUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ultimo_sync_user_id');
    }

    /**
     * URL pública pra exibir a imagem (assume storage:link configurado).
     */
    public function getImagemUrlAttribute(): ?string
    {
        return $this->imagem_path
            ? asset('storage/' . ltrim($this->imagem_path, '/'))
            : null;
    }
}
