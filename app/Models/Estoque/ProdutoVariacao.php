<?php

namespace App\Models\Estoque;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Opção de variação cadastrada num produto (cor ou tamanho).
 * Ver migration create_estoque_produto_variacoes_table.
 */
class ProdutoVariacao extends Model
{
    use HasFactory;

    protected $table = 'estoque_produto_variacoes';

    public const TIPO_COR               = 'cor';
    public const TIPO_TAMANHO_NUMERICO  = 'tamanho_numerico';
    public const TIPO_TAMANHO_VESTUARIO = 'tamanho_vestuario';

    protected $fillable = ['produto_id', 'tipo', 'valor', 'ordem'];

    protected $casts = ['ordem' => 'integer'];

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }
}
