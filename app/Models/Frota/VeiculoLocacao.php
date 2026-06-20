<?php

namespace App\Models\Frota;

use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoLocacao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculos_locacaos';

    protected $fillable = [
        'company_id', 'id_obra', 'veiculo_id', 'id_obraDestino',
        'id_funcionario', 'id_funcionario_destino', 'tipo_veiculo',
        'data_inicio', 'data_prevista', 'data_fim',
        'data_sincronizacao', 'sync_status',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_prevista' => 'date',
        'data_fim' => 'date',
        'data_sincronizacao' => 'datetime',
    ];

    /* =========================================================
     * Relações
     * ========================================================= */
    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function obraOrigem() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function obraDestino() { return $this->belongsTo(Obra::class, 'id_obraDestino'); }
    public function funcionario() { return $this->belongsTo(Funcionario::class, 'id_funcionario'); }
    public function funcionarios() { return $this->belongsTo(Funcionario::class, 'id_funcionario'); }
    public function funcionarioDestino() { return $this->belongsTo(Funcionario::class, 'id_funcionario_destino'); }
    public function funcionario_destino() { return $this->belongsTo(Funcionario::class, 'id_funcionario_destino'); }

    public function manutencoes()
    {
        return $this->hasMany(VeiculoManutencao::class, 'veiculo_id', 'veiculo_id');
    }

    /* =========================================================
     * Scopes
     * ========================================================= */

    /**
     * Conta dias do veículo em manutenção dentro da janela [data_inicio .. data_fim||hoje]
     * da locação. Reproduz a lógica do legacy (VeiculoLocacaoController::show).
     */
    public function scopeWithDiasManutencao(Builder $query)
    {
        return $query->selectRaw('
            veiculos_locacaos.*,
            (
                SELECT COALESCE(SUM(
                    DATEDIFF(
                        LEAST(
                            IFNULL(veiculos_locacaos.data_fim, CURDATE()),
                            veiculo_manutencaos.data_conclusao
                        ),
                        GREATEST(
                            veiculos_locacaos.data_inicio,
                            veiculo_manutencaos.data_de_execucao
                        )
                    ) + 1
                ), 0)
                FROM veiculo_manutencaos
                WHERE veiculo_manutencaos.veiculo_id = veiculos_locacaos.veiculo_id
                  AND veiculo_manutencaos.deleted_at IS NULL
                  AND veiculo_manutencaos.data_de_execucao IS NOT NULL
                  AND veiculo_manutencaos.data_conclusao IS NOT NULL
                  AND veiculo_manutencaos.data_de_execucao <= IFNULL(veiculos_locacaos.data_fim, CURDATE())
                  AND veiculo_manutencaos.data_conclusao >= veiculos_locacaos.data_inicio
            ) as dias_em_manutencao
        ');
    }
}
