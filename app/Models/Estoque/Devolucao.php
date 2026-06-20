<?php

namespace App\Models\Estoque;

use App\Models\Obra;
use App\Models\Traits\Tenantable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Devolução interna de material.
 *
 * Fluxo: PENDENTE → APROVADA (gera mov DEVOLUCAO) ou REJEITADA.
 * Quem aprova precisa de can_edit no módulo estoque.devolucoes
 * (configurável por usuário/empresa).
 */
class Devolucao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'estoque_devolucoes';

    public const STATUS_PENDENTE  = 'PENDENTE';
    public const STATUS_APROVADA  = 'APROVADA';
    public const STATUS_REJEITADA = 'REJEITADA';

    public const ESTADO_NOVO      = 'NOVO';
    public const ESTADO_USADO_OK  = 'USADO_OK';
    public const ESTADO_AVARIADO  = 'AVARIADO';

    protected $fillable = [
        'company_id', 'numero',
        'funcionario_user_id', 'funcionario_id', 'produto_id', 'obra_id',
        'movimentacao_saida_id', 'movimentacao_gerada_id',
        'quantidade', 'valor_unitario',
        'estado_material', 'motivo', 'observacao',
        'status', 'data_criacao',
        'aprovador_user_id', 'data_aprovacao', 'motivo_rejeicao',
    ];

    protected $casts = [
        'data_criacao'    => 'datetime',
        'data_aprovacao'  => 'datetime',
        'quantidade'      => 'decimal:3',
        'valor_unitario'  => 'decimal:2',
    ];

    public function funcionario(): BelongsTo  { return $this->belongsTo(User::class, 'funcionario_user_id'); }
    public function funcionarioObra(): BelongsTo {
        return $this->belongsTo(\App\Models\Funcionario::class, 'funcionario_id');
    }
    public function aprovador(): BelongsTo    { return $this->belongsTo(User::class, 'aprovador_user_id'); }
    public function produto(): BelongsTo      { return $this->belongsTo(Produto::class); }
    public function obra(): BelongsTo         { return $this->belongsTo(Obra::class); }
    public function movimentacaoSaida(): BelongsTo  { return $this->belongsTo(Movimentacao::class, 'movimentacao_saida_id'); }
    public function movimentacaoGerada(): BelongsTo { return $this->belongsTo(Movimentacao::class, 'movimentacao_gerada_id'); }

    public static function gerarNumero(int $companyId): string
    {
        $ano = date('Y');
        $prefix = "DEV-{$ano}-";
        $ultimo = static::where('company_id', $companyId)
            ->where('numero', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('numero');
        $seq = $ultimo ? ((int) substr($ultimo, strlen($prefix))) + 1 : 1;
        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    public function getValorTotalAttribute(): float
    {
        return (float) $this->quantidade * (float) $this->valor_unitario;
    }
}
