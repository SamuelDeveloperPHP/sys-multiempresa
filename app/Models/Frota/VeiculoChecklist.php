<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoChecklist extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_checklist';

    protected $fillable = [
        'company_id', 'id_veiculo', 'nome_checklist', 'situacao',
        'user_create', 'user_edit',
        'data_sincronizacao', 'sync_status',
    ];

    protected $casts = ['data_sincronizacao' => 'datetime'];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
    public function itens() { return $this->hasMany(VeiculoChecklistItem::class, 'id_checklist'); }
}
