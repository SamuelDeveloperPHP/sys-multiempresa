<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoChecklistItem extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_checklist_itens';

    protected $fillable = [
        'company_id', 'id_checklist', 'id_veiculo',
        'nome_servico', 'periodo_maq_vei', 'alerta_venci', 'tipo_itens',
        'periodo_dias', 'alert_venc_dias',
        'user_create', 'user_edit', 'situacao',
        'data_sincronizacao', 'sync_status',
    ];

    protected $casts = ['data_sincronizacao' => 'datetime'];

    public function checklist() { return $this->belongsTo(VeiculoChecklist::class, 'id_checklist'); }
    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
}
