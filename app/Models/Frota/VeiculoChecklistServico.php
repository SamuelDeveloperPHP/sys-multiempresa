<?php

namespace App\Models\Frota;

use App\Models\Obra;
use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoChecklistServico extends Model
{
    use HasFactory, SoftDeletes, Tenantable, Syncable;

    protected $table = 'veiculo_checklist_itens_servicos';

    protected $fillable = [
        'company_id', 'id_obra', 'id_veiculo', 'id_checklist',
        'id_local', 'status', 'status_ciclo', 'tipo_checklist',
        'id_abertura_vinculada', 'data_fechamento', 'anomalia_offline',
        'foto_extra_1', 'desc_extra_1', 'foto_extra_2', 'desc_extra_2',
        'foto_extra_3', 'desc_extra_3', 'foto_extra_4', 'desc_extra_4',
        'data_cadastro', 'user_create', 'user_edit',
        'id_horimetro', 'id_quilometragem',
        // Campos adicionados para módulo Mobile (offline-first)
        'responsavel', 'km_atual', 'hr_atual', 'respostas', 'observacao_geral', 'data_execucao',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
    ];

    protected $casts = [
        'anomalia_offline' => 'boolean',
        'data_fechamento' => 'datetime',
        'data_cadastro' => 'datetime',
        'data_execucao' => 'datetime',
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
        'respostas' => 'array',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function checklist() { return $this->belongsTo(VeiculoChecklist::class, 'id_checklist'); }
    public function itensRealizados() { return $this->hasMany(VeiculoChecklistRealizado::class, 'id_checklist_realizado', 'id_local'); }
    public function horimetro() { return $this->belongsTo(VeiculoHorimetro::class, 'id_horimetro'); }
    public function quilometragem() { return $this->belongsTo(VeiculoQuilometragem::class, 'id_quilometragem'); }
}
