<?php

namespace App\Models\Frota;

use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoAbastecimento extends Model
{
    use HasFactory, SoftDeletes, Tenantable, Syncable;

    protected $table = 'veiculo_abastecimentos';

    protected $fillable = [
        'company_id', 'id_local', 'veiculo_id', 'id_obra', 'id_funcionario',
        'user_create', 'user_edit', 'data_abastecimento',
        'km_anterior', 'km_atual', 'hr_anterior', 'hr_atual',
        'fornecedor', 'combustivel', 'tipo',
        'quantidade', 'valor_do_litro', 'valor_total',
        'arquivo_app', 'arquivo_servidor',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
        'client_uuid', // idempotência do sync mobile (dedupe por UUID do device)
    ];

    protected $casts = [
        'data_abastecimento' => 'datetime',
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
        'quantidade' => 'decimal:2',
        'valor_do_litro' => 'decimal:4',
        'valor_total' => 'decimal:2',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function funcionario() { return $this->belongsTo(Funcionario::class, 'id_funcionario'); }
}
