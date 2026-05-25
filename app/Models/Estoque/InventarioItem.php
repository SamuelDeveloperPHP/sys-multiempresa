<?php

namespace App\Models\Estoque;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioItem extends Model
{
    use HasFactory;

    protected $table = 'estoque_inventario_itens';

    protected $fillable = [
        'inventario_id', 'produto_id',
        'saldo_sistema', 'saldo_contado', 'diferenca',
        'valor_unitario', 'valor_diferenca',
        'observacao', 'contado',
    ];

    protected $casts = [
        'saldo_sistema'   => 'decimal:3',
        'saldo_contado'   => 'decimal:3',
        'diferenca'       => 'decimal:3',
        'valor_unitario'  => 'decimal:2',
        'valor_diferenca' => 'decimal:2',
        'contado'         => 'boolean',
    ];

    public function inventario(): BelongsTo { return $this->belongsTo(Inventario::class); }
    public function produto(): BelongsTo    { return $this->belongsTo(Produto::class); }
}
