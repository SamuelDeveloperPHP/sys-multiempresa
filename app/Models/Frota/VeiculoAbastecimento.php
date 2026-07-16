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
        'fornecedor', 'combustivel', 'id_combustivel', 'tipo',
        'quantidade', 'valor_do_litro', 'valor_total',
        'arquivo_app', 'arquivo_servidor',
        'sync_status', 'data_sincronizacao', 'sync_error', 'sync_attempts', 'synced_at',
        'client_uuid', // idempotência do sync mobile (dedupe por UUID do device)
    ];

    protected $casts = [
        // Sem cast, o tipo de veiculo_id é o que o driver PDO entrega, e isso
        // varia por ambiente: o WAMP local devolve int, a hospedagem LiteSpeed
        // devolve string. O Laravel converte a chave primária sozinho, mas não
        // as estrangeiras — daí a API emitir {"id": 634, "veiculo_id": "11"}.
        // Isso quebrava, SÓ em produção: o cache offline (Dexie indexa por
        // veiculo_id e a chave "11" não bate com 11) e os abort_unless(===)
        // de updateAbastecimento/destroyAbastecimento, que davam 404 sempre.
        'veiculo_id' => 'integer',
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
    public function combustivelRef() { return $this->belongsTo(Combustivel::class, 'id_combustivel'); }
}
