<?php

namespace App\Models\Frota;

use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoLocacao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculos_locacaos';

    protected $fillable = [
        'company_id', 'id_obra', 'veiculo_id', 'id_obraDestino',
        'id_funcionario', 'id_funcionario_destino', 'tipo_veiculo',
        'data_inicio', 'data_prevista', 'data_fim',
        'data_sincronizacao', 'sync_status',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_prevista' => 'date',
        'data_fim' => 'date',
        'data_sincronizacao' => 'datetime',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function obraDestino() { return $this->belongsTo(Obra::class, 'id_obraDestino'); }
    public function funcionario() { return $this->belongsTo(Funcionario::class, 'id_funcionario'); }
    public function funcionarioDestino() { return $this->belongsTo(Funcionario::class, 'id_funcionario_destino'); }
}
