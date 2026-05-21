<?php

namespace App\Models;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Fornecedor extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'fornecedores';

    protected $fillable = [
        'company_id', 'id_obra',
        'nome_fantasia', 'razao_social', 'atividade_principal',
        'cnpj', 'cpf',
        'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado',
        'email', 'celular',
        'status',
        'user_create', 'user_edit',
    ];

    public function obra() { return $this->belongsTo(Obra::class, 'id_obra'); }
}
