<?php

namespace App\Models\Tcpo;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Insumo do TCPO (mão de obra / material / equipamento).
 *
 * CATÁLOGO GLOBAL de referência (sem company_id). Idempotência via (base, codigo).
 * O preço é um snapshot de uma região/data.
 */
class TcpoInsumo extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tcpo_insumos';

    public const CLASSE_MOD = 'MOD'; // mão de obra
    public const CLASSE_MAT = 'MAT'; // material
    public const CLASSE_EQP = 'EQP'; // equipamento

    protected $fillable = [
        'base', 'codigo', 'descricao', 'unidade', 'classe',
        'preco_unitario', 'preco_regiao', 'preco_data', 'ativo',
    ];

    protected $casts = [
        'preco_unitario' => 'decimal:4',
        'ativo'          => 'boolean',
    ];

    public function itens(): HasMany
    {
        return $this->hasMany(TcpoComposicaoItem::class, 'insumo_id');
    }
}
