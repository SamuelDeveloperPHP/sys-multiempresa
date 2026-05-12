<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FuncionarioFuncao extends Model
{
    use HasFactory, SoftDeletes, Traits\Tenantable;

    protected $table = 'funcao_funcionarios';
    protected $fillable = ['company_id', 'funcao'];

    public function funcionarios() { return $this->hasMany(Funcionario::class, 'id_funcao'); }
}
