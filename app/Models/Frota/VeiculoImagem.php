<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoImagem extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_imagens';

    protected $fillable = [
        'company_id', 'veiculo_id',
        'arquivo', 'descricao', 'ordem',
        'user_create', 'user_edit',
    ];

    protected $casts = ['ordem' => 'integer'];

    public function veiculo()
    {
        return $this->belongsTo(Veiculo::class, 'veiculo_id');
    }
}
