<?php

namespace App\Models\Frota;

use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoPreventivaItemRealizada extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_preventivas_itens_realizadas';

    protected $fillable = [
        'company_id', 'id_veiculo', 'fornecedor_id', 'id_obra',
        'id_preventiva', 'id_motorista', 'tipo',
        'nf_pecas', 'nf_mao_obra',
        'valor_do_servico', 'valor_da_mao_obra', 'total_valor_servico',
        'quilometragem_atual', 'quilometragem_nova', 'campo_calc_km',
        'horimetro_atual', 'horimetro_proximo', 'campo_cal_hr',
        'data_de_execucao', 'data_previsao_termino', 'data_conclusao', 'campo_cal_mes',
        'data_de_vencimento', 'descricao', 'status_realizado',
        'user_create', 'user_edit',
        'sync_status', 'data_sincronizacao',
    ];

    protected $casts = [
        'data_de_execucao' => 'date',
        'data_previsao_termino' => 'date',
        'data_conclusao' => 'date',
        'data_de_vencimento' => 'date',
        'data_sincronizacao' => 'datetime',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function preventiva() { return $this->belongsTo(VeiculoPreventiva::class, 'id_preventiva'); }
    public function motorista() { return $this->belongsTo(Funcionario::class, 'id_motorista'); }
}
