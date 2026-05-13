<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FuncionarioSetor extends Model
{
    use HasFactory, SoftDeletes, Traits\Tenantable;

    // Tabela legada (singular). Coluna do nome também é diferente.
    protected $table = 'funcionarios_setor';

    protected $fillable = ['company_id', 'nome_setor'];

    public function funcionarios()
    {
        return $this->hasMany(Funcionario::class, 'id_setor');
    }

    /** Acessor de compatibilidade: $setor->nome continua funcionando. */
    public function getNomeAttribute(): ?string
    {
        return $this->nome_setor;
    }
}
