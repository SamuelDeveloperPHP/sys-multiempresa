<?php

namespace App\Models\Frota;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Combustível + fatores de emissão de CO₂ (referência nacional, global).
 * Ver migration 2026_07_09_130000. NÃO é Tenantable — é dado de referência.
 */
class Combustivel extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'combustiveis';

    protected $fillable = [
        'nome', 'fator_fossil', 'fator_biogenico', 'perc_biogenico', 'ativo', 'ordem',
    ];

    protected $casts = [
        'fator_fossil'    => 'decimal:4',
        'fator_biogenico' => 'decimal:4',
        'perc_biogenico'  => 'decimal:4',
        'ativo'           => 'boolean',
        'ordem'           => 'integer',
    ];

    /** CO₂ fóssil por litro de combustível de bomba (o que "conta"). */
    public function co2FossilPorLitro(): float
    {
        return (1 - (float) $this->perc_biogenico) * (float) $this->fator_fossil;
    }

    /** CO₂ biogênico por litro (reportado à parte). */
    public function co2BiogenicoPorLitro(): float
    {
        return (float) $this->perc_biogenico * (float) $this->fator_biogenico;
    }
}
