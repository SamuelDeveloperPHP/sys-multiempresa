<?php

namespace App\Models\Estoque;

use App\Models\Funcionario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ficha de EPI emitida (NR-6). O `conteudo` é guardado como JSON canônico
 * (string crua, SEM cast) para que o hash bata exatamente na verificação.
 *
 * Ver migration create_estoque_epi_fichas_table.
 */
class EpiFicha extends Model
{
    protected $table = 'estoque_epi_fichas';

    protected $fillable = [
        'company_id', 'funcionario_id', 'codigo', 'hash',
        'conteudo', 'assinatura', 'assinatura_tipo', 'emitida_por',
    ];

    public function funcionario(): BelongsTo
    {
        return $this->belongsTo(Funcionario::class);
    }

    /** Snapshot decodificado (array) para exibição. */
    public function getDadosAttribute(): array
    {
        return json_decode($this->conteudo, true) ?: [];
    }

    /** Recalcula o hash do conteúdo e compara (integridade). */
    public function estaIntegra(): bool
    {
        return hash_equals(
            $this->hash,
            hash_hmac('sha256', $this->conteudo, config('app.key'))
        );
    }
}
