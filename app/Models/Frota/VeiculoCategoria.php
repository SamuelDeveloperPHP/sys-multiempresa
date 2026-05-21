<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoCategoria extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_categorias';

    protected $fillable = [
        'company_id', 'nome_categoria', 'status_categoria',
        'user_create', 'user_edit',
    ];

    public function subcategorias()
    {
        return $this->hasMany(VeiculoSubCategoria::class, 'id_categoria');
    }

    public function veiculos()
    {
        return $this->hasMany(Veiculo::class, 'id_categoria');
    }
}
