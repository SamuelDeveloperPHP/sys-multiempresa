<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoPreventiva extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_preventivas';

    protected $fillable = [
        'company_id', 'id_veiculo',
        'nome_preventiva', 'nome_servico', 'tipo_veiculo', 'situacao',
        'periodo', 'tipo', 'alerta_venci',
        'user_create', 'user_edit',
        'sync_status', 'data_sincronizacao',
    ];

    protected $casts = ['data_sincronizacao' => 'datetime'];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
    public function itens()   { return $this->hasMany(VeiculoPreventivaItem::class, 'id_preventiva'); }
    public function itensRealizados() { return $this->hasMany(VeiculoPreventivaItemRealizada::class, 'id_preventiva'); }
}
