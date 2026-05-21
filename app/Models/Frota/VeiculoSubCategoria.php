<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoSubCategoria extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_subcategorias';

    protected $fillable = [
        'company_id', 'id_categoria',
        'nome_subcategoria', 'status_subcategoria',
        'user_create', 'user_edit',
    ];

    public function categoria()
    {
        return $this->belongsTo(VeiculoCategoria::class, 'id_categoria');
    }

    public function veiculos()
    {
        return $this->hasMany(Veiculo::class, 'id_subcategoria');
    }
}
