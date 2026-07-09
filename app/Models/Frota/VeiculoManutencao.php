<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoManutencao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_manutencaos';

    protected $fillable = [
        'company_id', 'veiculo_id', 'fornecedor_id', 'servico_id', 'id_obra', 'id_usuario',
        'tipo', 'valor_do_servico', 'notas_fiscais',
        'quilometragem_atual', 'quilometragem_nova', 'horimetro_atual', 'horimetro_proximo',
        'data_de_execucao', 'data_previsao_termino', 'data_conclusao', 'data_de_vencimento',
        'descricao', 'situacao', 'status', 'arquivo',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'valor_do_servico'      => 'decimal:2',
        'notas_fiscais'         => 'array',
        'data_de_execucao'      => 'date',
        'data_previsao_termino' => 'date',
        'data_conclusao'        => 'date',
        'data_de_vencimento'    => 'date',
        'situacao'              => 'integer',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
    public function fornecedor() { return $this->belongsTo(\App\Models\Fornecedor::class, 'fornecedor_id'); }
    public function obra() { return $this->belongsTo(\App\Models\Obra::class, 'id_obra'); }
    public function responsavel() { return $this->belongsTo(\App\Models\Funcionario::class, 'id_usuario'); }
}
