<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Model;

class PneuMontagemAtiva extends Model
{
    use Tenantable;

    protected $table = 'pneu_montagens_ativas';

    protected $fillable = [
        'company_id',
        'pneu_id',
        'veiculo_id',
        'posicao',
        'movimentacao_id',
        'montado_em',
    ];

    protected $casts = [
        'montado_em' => 'date',
    ];

    public function pneu()
    {
        return $this->belongsTo(Pneu::class, 'pneu_id');
    }

    public function veiculo()
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id');
    }

    public function movimentacao()
    {
        return $this->belongsTo(PneuMovimentacao::class, 'movimentacao_id');
    }
}
