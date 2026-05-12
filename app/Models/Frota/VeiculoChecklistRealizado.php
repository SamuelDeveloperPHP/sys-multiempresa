<?php

namespace App\Models\Frota;

use App\Models\Obra;
use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoChecklistRealizado extends Model
{
    use HasFactory, SoftDeletes, Tenantable, Syncable;

    protected $table = 'veiculo_checklist_itens_realizados';

    protected $fillable = [
        'company_id', 'id_obra', 'id_checklist', 'id_local',
        'id_checklist_realizado', 'id_checklist_itens', 'id_veiculo',
        'data_cadastro', 'status', 'arquivo_app', 'arquivo_servidor',
        'user_create', 'horimetro_atual', 'horimetro_novo',
        'quilometragem_atual', 'quilometragem_nova', 'observacao',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
    ];

    protected $casts = [
        'data_cadastro' => 'datetime',
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function checklist() { return $this->belongsTo(VeiculoChecklist::class, 'id_checklist'); }
    public function item() { return $this->belongsTo(VeiculoChecklistItem::class, 'id_checklist_itens'); }
    public function servico() { return $this->belongsTo(VeiculoChecklistServico::class, 'id_checklist_realizado', 'id_local'); }
}
