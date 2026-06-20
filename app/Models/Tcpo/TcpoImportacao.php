<?php

namespace App\Models\Tcpo;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Uma execução de importação do TCPO → catálogo global.
 * Espelha EstoqueImportacao (base do polling de progresso, quando houver UI).
 */
class TcpoImportacao extends Model
{
    use HasFactory;

    protected $table = 'tcpo_importacoes';

    public const STATUS_QUEUED    = 'queued';
    public const STATUS_RUNNING   = 'running';
    public const STATUS_SUCCESS   = 'success';
    public const STATUS_PARTIAL   = 'partial';
    public const STATUS_FAILED    = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_FINAIS = [self::STATUS_SUCCESS, self::STATUS_PARTIAL, self::STATUS_FAILED, self::STATUS_CANCELLED];

    protected $fillable = [
        'user_id', 'base', 'escopo', 'status',
        'queued_at', 'started_at', 'finished_at',
        'total_composicoes_previsto', 'total_composicoes_importadas',
        'total_insumos', 'total_itens', 'total_categorias', 'total_falhas',
        'progresso', 'erro_global',
    ];

    protected $casts = [
        'queued_at'   => 'datetime',
        'started_at'  => 'datetime',
        'finished_at' => 'datetime',
        'progresso'   => 'array',
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

    /** Percentual concluído (0–100). */
    public function getPercentualAttribute(): int
    {
        if ($this->total_composicoes_previsto <= 0) {
            return $this->isFinal() ? 100 : 0;
        }
        $pct = (int) floor(($this->total_composicoes_importadas / $this->total_composicoes_previsto) * 100);
        return max(0, min(100, $pct));
    }
}
