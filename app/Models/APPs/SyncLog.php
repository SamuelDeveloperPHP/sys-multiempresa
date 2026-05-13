<?php

namespace App\Models\APPs;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class SyncLog extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'sync_logs';

    protected $fillable = [
        'company_id',
        'user_id',
        'uuid',
        'tabela',
        'etapa',
        'id_local',
        'server_id',
        'mensagem',
        'payload_resumido',
        'stack_trace',
        'status_envio_log',
    ];

    /**
     * Adaptado para o padrão de colunas do sys-multiempresa
     */
    public static function registrar($tipoOperacao, $registro, $uuidSincronizacao = null)
    {
        $uuid = $registro->uuid ?? (Str::uuid()->toString());

        $log = new SyncLog();
        $log->uuid = $uuidSincronizacao ?? $uuid;
        $log->etapa = $tipoOperacao; // mapeado tipo_operacao para etapa
        $log->server_id = $registro->id; // registro_id do servidor
        $log->tabela = $registro->getTable();
        $log->status_envio_log = 'Pendente';
        
        $log->payload_resumido = json_encode([
            'campos' => array_keys($registro->getChanges()),
            'valores_anteriores' => $registro->getOriginal(),
            'valores_novos' => $registro->getChanges(),
            'registro_uuid' => $uuid,
        ]);
        
        $log->user_id = auth()->id();
        
        // Pega o company_id do usuário logado se existir, ou do registro
        if (auth()->check() && auth()->user()->companies()->exists()) {
            $log->company_id = auth()->user()->companies()->first()->id;
        } elseif (isset($registro->company_id)) {
            $log->company_id = $registro->company_id;
        }

        $log->save();
    }
}
