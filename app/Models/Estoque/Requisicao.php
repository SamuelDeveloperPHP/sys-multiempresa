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

/**
 * Requisição de material (cabeçalho).
 *
 * Fluxo:
 *   RASCUNHO → ENVIADA → APROVADA → ATENDIDA
 *                     ↘ REJEITADA
 *           ↘ CANCELADA
 */
class Requisicao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'estoque_requisicoes';

    public const STATUS_RASCUNHO  = 'RASCUNHO';
    public const STATUS_ENVIADA   = 'ENVIADA';
    public const STATUS_APROVADA  = 'APROVADA';
    public const STATUS_ATENDIDA  = 'ATENDIDA';
    public const STATUS_REJEITADA = 'REJEITADA';
    public const STATUS_CANCELADA = 'CANCELADA';

    public const STATUS_ABERTOS = [self::STATUS_RASCUNHO, self::STATUS_ENVIADA, self::STATUS_APROVADA];

    protected $fillable = [
        'company_id', 'numero',
        'obra_origem_id', 'obra_destino_id',
        'solicitante_id', 'aprovador_id', 'atendente_id',
        'status',
        'data_solicitacao', 'data_envio', 'data_aprovacao', 'data_atendimento',
        'observacao_solicitante', 'observacao_aprovador', 'motivo_rejeicao',
        'valor_total_estimado',
    ];

    protected $casts = [
        'data_solicitacao'      => 'date',
        'data_envio'            => 'datetime',
        'data_aprovacao'        => 'datetime',
        'data_atendimento'      => 'datetime',
        'valor_total_estimado'  => 'decimal:2',
    ];

    public function obraOrigem(): BelongsTo  { return $this->belongsTo(Obra::class, 'obra_origem_id'); }
    public function obraDestino(): BelongsTo { return $this->belongsTo(Obra::class, 'obra_destino_id'); }
    public function solicitante(): BelongsTo { return $this->belongsTo(User::class, 'solicitante_id'); }
    public function aprovador(): BelongsTo   { return $this->belongsTo(User::class, 'aprovador_id'); }
    public function atendente(): BelongsTo   { return $this->belongsTo(User::class, 'atendente_id'); }
    public function itens(): HasMany         { return $this->hasMany(RequisicaoItem::class); }

    /**
     * Gera número sequencial REQ-{ANO}-{NNNNN} para a empresa.
     */
    public static function gerarNumero(int $companyId): string
    {
        $ano = date('Y');
        $prefix = "REQ-{$ano}-";
        $ultimo = static::where('company_id', $companyId)
            ->where('numero', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('numero');
        $seq = $ultimo ? ((int) substr($ultimo, strlen($prefix))) + 1 : 1;
        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
