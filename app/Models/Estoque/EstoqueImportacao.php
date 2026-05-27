<?php

namespace App\Models\Estoque;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Uma execução de importação do catálogo Leroy → estoque_produtos.
 * Base do polling da tela de progresso (barra de %, por categoria).
 */
class EstoqueImportacao extends Model
{
    use HasFactory;

    protected $table = 'estoque_importacoes';

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
        'total_produtos_previsto', 'total_produtos_importados',
        'total_categorias', 'total_imagens', 'total_falhas',
        'progresso_categorias', 'erro_global',
    ];

    protected $casts = [
        'queued_at'            => 'datetime',
        'started_at'           => 'datetime',
        'finished_at'          => 'datetime',
        'progresso_categorias' => 'array',
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
        if ($this->total_produtos_previsto <= 0) {
            return $this->isFinal() ? 100 : 0;
        }
        $pct = (int) floor(($this->total_produtos_importados / $this->total_produtos_previsto) * 100);
        return max(0, min(100, $pct));
    }
}
