<?php

namespace App\Models\Estoque\LeroyMerlin;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Log de uma execução de sincronização Leroy Merlin.
 *
 * Status:
 *   queued    → na fila, ainda não começou
 *   running   → em execução agora
 *   success   → terminou sem falhas
 *   partial   → terminou mas algumas categorias falharam
 *   failed    → erro global, abortou
 *   cancelled → operador cancelou manualmente
 */
class LeroySyncRun extends Model
{
    use HasFactory;

    protected $table = 'estoque_leroy_sync_runs';

    public const STATUS_QUEUED    = 'queued';
    public const STATUS_RUNNING   = 'running';
    public const STATUS_SUCCESS   = 'success';
    public const STATUS_PARTIAL   = 'partial';
    public const STATUS_FAILED    = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_FINAIS = [self::STATUS_SUCCESS, self::STATUS_PARTIAL, self::STATUS_FAILED, self::STATUS_CANCELLED];

    protected $fillable = [
        'user_id', 'status',
        'queued_at', 'started_at', 'finished_at',
        'total_categorias_principais', 'total_categorias_primarias',
        'total_categorias_secundarias', 'total_produtos', 'total_falhas',
        'falhas_detalhes', 'erro_global',
    ];

    protected $casts = [
        'queued_at'        => 'datetime',
        'started_at'       => 'datetime',
        'finished_at'      => 'datetime',
        'falhas_detalhes'  => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isFinal(): bool
    {
        return in_array($this->status, self::STATUS_FINAIS, true);
    }

    public function isAtivo(): bool
    {
        return in_array($this->status, [self::STATUS_QUEUED, self::STATUS_RUNNING], true);
    }
}
