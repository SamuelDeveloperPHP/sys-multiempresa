<?php

namespace App\Models\Frota;

use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VeiculoHorimetro extends Model
{
    use HasFactory, Tenantable, Syncable;

    protected $table = 'veiculo_horimetro';

    protected $fillable = [
        'company_id', 'id_local', 'veiculo_id', 'id_funcionario', 'id_obra',
        'user_create', 'user_edit',
        'horimetro_atual', 'horimetro_novo', 'data_horimetro',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
    ];

    protected $casts = [
        'data_horimetro' => 'datetime',
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function funcionario() { return $this->belongsTo(Funcionario::class, 'id_funcionario'); }
}
