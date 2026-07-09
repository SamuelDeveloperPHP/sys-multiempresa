<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Linha de checklist de uma OS preventiva: um item do plano marcado como
 * realizado ('sim') ou não ('nao', com justificativa). Ver a migration
 * 2026_07_09_120001 para a semântica de "pendência herdada".
 */
class VeiculoPreventivaItemServico extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_preventivas_itens_servicos';

    protected $fillable = [
        'company_id', 'id_manutencao', 'id_servico_preventiva',
        'id_veiculo', 'id_preventiva',
        'nome_servico', 'periodo',
        'status', 'observacao', 'criticidade',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'periodo' => 'integer',
    ];

    public function manutencao()      { return $this->belongsTo(VeiculoPreventivaItemRealizada::class, 'id_manutencao'); }
    public function itemPlano()       { return $this->belongsTo(VeiculoPreventivaItem::class, 'id_servico_preventiva'); }
    public function preventiva()      { return $this->belongsTo(VeiculoPreventiva::class, 'id_preventiva'); }
    public function veiculo()         { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }

    public function realizado(): bool { return $this->status === 'sim'; }
}
