<?php

namespace App\Models\Tcpo;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Item (linha de detalhamento) de uma composição TCPO.
 * Liga a um insumo OU a uma sub-composição, com coeficiente e snapshot de preço.
 */
class TcpoComposicaoItem extends Model
{
    use HasFactory;

    protected $table = 'tcpo_composicao_itens';

    public const CLASSE_SUB = 'SUB'; // sub-composição (serviço dentro de serviço)

    protected $fillable = [
        'composicao_id', 'insumo_id', 'sub_composicao_id',
        'codigo', 'descricao', 'unidade', 'classe',
        'coeficiente', 'consumo', 'preco_unitario', 'total', 'ordem',
    ];

    protected $casts = [
        'coeficiente'    => 'decimal:6',
        'consumo'        => 'decimal:6',
        'preco_unitario' => 'decimal:4',
        'total'          => 'decimal:4',
        'ordem'          => 'integer',
    ];

    public function composicao(): BelongsTo
    {
        return $this->belongsTo(TcpoComposicao::class, 'composicao_id');
    }

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(TcpoInsumo::class, 'insumo_id');
    }

    public function subComposicao(): BelongsTo
    {
        return $this->belongsTo(TcpoComposicao::class, 'sub_composicao_id');
    }
}
