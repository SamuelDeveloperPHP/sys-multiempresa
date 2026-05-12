<?php

namespace App\Models\Frota;

use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VeiculoQuilometragem extends Model
{
    use HasFactory, Tenantable, Syncable;

    protected $table = 'veiculo_quilometragems';

    protected $fillable = [
        'company_id', 'id_local', 'veiculo_id', 'id_funcionario', 'id_obra',
        'user_create', 'user_edit',
        'quilometragem_atual', 'quilometragem_nova', 'data_quilometragem',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
    ];

    protected $casts = [
        'data_quilometragem' => 'datetime',
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function funcionario() { return $this->belongsTo(Funcionario::class, 'id_funcionario'); }
}
