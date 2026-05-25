<?php

namespace App\Models\Estoque;

use App\Models\Obra;
use App\Models\Traits\Tenantable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Inventario extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'estoque_inventarios';

    public const STATUS_ABERTO    = 'ABERTO';
    public const STATUS_FECHADO   = 'FECHADO';
    public const STATUS_CANCELADO = 'CANCELADO';

    protected $fillable = [
        'company_id', 'numero', 'obra_id', 'responsavel_id',
        'status', 'data_inicio', 'data_fechamento',
        'observacao', 'valor_diferenca_total', 'qtd_itens_divergentes',
    ];

    protected $casts = [
        'data_inicio'             => 'date',
        'data_fechamento'         => 'datetime',
        'valor_diferenca_total'   => 'decimal:2',
        'qtd_itens_divergentes'   => 'integer',
    ];

    public function obra(): BelongsTo         { return $this->belongsTo(Obra::class); }
    public function responsavel(): BelongsTo  { return $this->belongsTo(User::class, 'responsavel_id'); }
    public function itens(): HasMany          { return $this->hasMany(InventarioItem::class); }

    public static function gerarNumero(int $companyId): string
    {
        $ano = date('Y');
        $prefix = "INV-{$ano}-";
        $ultimo = static::where('company_id', $companyId)
            ->where('numero', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('numero');
        $seq = $ultimo ? ((int) substr($ultimo, strlen($prefix))) + 1 : 1;
        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
