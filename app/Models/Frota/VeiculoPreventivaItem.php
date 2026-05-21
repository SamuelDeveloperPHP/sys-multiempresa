<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoPreventivaItem extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_preventivas_itens';

    protected $fillable = [
        'company_id', 'id_preventiva', 'id_veiculo',
        'nome_servico', 'serial_number',
        'periodo_maq_vei', 'periodo_mes',
        'tipo_itens', 'situacao',
        'alerta_venci', 'alert_venc_mes',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'periodo_maq_vei' => 'integer',
        'periodo_mes'     => 'integer',
        'alerta_venci'    => 'integer',
        'alert_venc_mes'  => 'integer',
    ];

    public function preventiva() { return $this->belongsTo(VeiculoPreventiva::class, 'id_preventiva'); }
    public function veiculo()    { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
}
