<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AnexoFuncionario extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = "anexos_funcionarios";

    protected $fillable = [
        'id_funcionario',
        'id_funcao',
        'id_qualificacao',
        'usuario_cad',
        'nome_arquivo',
        'arquivo',
        'data_conclusao',
        'data_validade_doc',
        'data_aprovacao',
        'situacao_doc',
        'usuario_aprov',
        'usuario_reprov',
        'observacoes',
        'ativo',
        'user_edit',
        'user_create'
    ];

    public function situacoes()
    {
        return $this->belongsTo(Situacao::class, 'situacao_doc');
    }

    public function funcionario_qualificacao()
    {
        return $this->belongsTo(FuncionarioQualificacao::class, 'id_funcionario', 'id_funcionario')
                    ->whereColumn('id_funcao', 'id_funcao')
                    ->whereColumn('id_qualificacao', 'id_qualificacao');
    }
    
    public function qualificacao()
    {
        return $this->belongsTo(FuncionarioQualificacao::class, 'id_qualificacao');
    }

    public function funcionario()
    {
        return $this->belongsTo(Funcionario::class, 'id_funcionario');
    }
    
    public function nomes_qualificacao()
    {
        return $this->belongsTo(FuncaoQualificacao::class, 'id_qualificacao');
    }
    
    public function historico()
    {
        return $this->hasMany(AnexoFuncionarioHistorico::class, 'id_anexo');
    }
}
