<?php

namespace App\Models\Tcpo;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Composição (serviço) do TCPO.
 *
 * CATÁLOGO GLOBAL de referência (sem company_id). Idempotência via (base, codigo).
 * Os totais são snapshot de preço (região/data). O detalhamento técnico
 * (insumos + coeficientes) está em tcpo_composicao_itens.
 */
class TcpoComposicao extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tcpo_composicoes';

    protected $fillable = [
        'categoria_id', 'base', 'codigo', 'codigo_alt', 'tipo', 'unidade', 'descricao',
        'memorial_conteudo', 'memorial_criterio', 'memorial_normas',
        'preco_regiao', 'preco_data',
        'total_sem_taxas', 'total_com_taxas', 'total_mod', 'total_mat', 'total_eqp',
        'ativo',
    ];

    protected $casts = [
        'total_sem_taxas' => 'decimal:4',
        'total_com_taxas' => 'decimal:4',
        'total_mod'       => 'decimal:4',
        'total_mat'       => 'decimal:4',
        'total_eqp'       => 'decimal:4',
        'ativo'           => 'boolean',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(TcpoCategoria::class, 'categoria_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(TcpoComposicaoItem::class, 'composicao_id')->orderBy('ordem');
    }
}
