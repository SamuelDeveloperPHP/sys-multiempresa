<?php

namespace App\Models\Frota;

use App\Models\Obra;
use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoDiarioBordo extends Model
{
    use HasFactory, SoftDeletes, Tenantable, Syncable;

    protected $table = 'veiculos_diario_bordo';

    protected $fillable = [
        'company_id', 'id_local', 'ciclo_status',
        'horas_trabalhadas_minutos', 'descricao_encerramento',
        'id_obra', 'id_veiculo', 'id_user',
        'user_create', 'user_edit',
        'data_cadastro', 'horario_inicial', 'hr_anterior', 'km_anterior',
        'horario_final', 'hr_atual', 'km_atual',
        'descricao_atividade', 'arquivo_app', 'arquivo_servidor',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
        'client_uuid', // idempotência do sync mobile (dedupe por UUID do device)
    ];

    protected $casts = [
        'data_cadastro' => 'datetime',
        'horario_inicial' => 'datetime',
        'horario_final' => 'datetime',
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function user() { return $this->belongsTo(User::class, 'id_user'); }
}
