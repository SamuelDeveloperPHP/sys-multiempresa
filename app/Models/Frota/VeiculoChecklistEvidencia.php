<?php

namespace App\Models\Frota;

use App\Models\Traits\Syncable;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VeiculoChecklistEvidencia extends Model
{
    use HasFactory, Tenantable, Syncable;

    protected $table = 'veiculo_checklist_evidencias';

    protected $fillable = [
        'company_id', 'id_local',
        'parent_tabela', 'parent_id_local', 'campo_foto',
        'arquivo_local', 'arquivo_app', 'arquivo_servidor',
        'user_create', 'user_edit',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
    ];

    protected $casts = [
        'data_sincronizacao' => 'datetime',
        'synced_at' => 'datetime',
    ];
}
