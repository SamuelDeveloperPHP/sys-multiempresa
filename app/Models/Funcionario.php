<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Funcionario extends Model
{
    use HasFactory, SoftDeletes, Traits\Tenantable;

    protected $table = 'funcionarios';

    protected $fillable = [
        'company_id', 'id_obra', 'id_funcao', 'id_setor',
        'nome', 'matricula', 'cpf', 'status', 'imagem_usuario',
        'rg', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 
        'email', 'celular', 'nome_mae', 'genero', 'pis', 'estado_civil', 
        'dependentes', 'data_adminssao', 'data_demissao', 'situacao', 'afastado'
    ];

    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
    public function funcao() { return $this->belongsTo(FuncionarioFuncao::class, 'id_funcao'); }
    public function setor() { return $this->belongsTo(FuncionarioSetor::class, 'id_setor'); }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_funcionario');
    }
}
