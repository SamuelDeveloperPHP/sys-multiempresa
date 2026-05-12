<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FuncionarioSetor extends Model
{
    use HasFactory, SoftDeletes, Traits\Tenantable;

    protected $table = 'funcionario_setores';
    protected $fillable = ['company_id', 'nome'];

    public function funcionarios() { return $this->hasMany(Funcionario::class, 'id_setor'); }
}
