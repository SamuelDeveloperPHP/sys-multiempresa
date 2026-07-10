<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoTacografo extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculo_tacografos';

    protected $fillable = [
        'company_id', 'veiculo_id',
        'descricao', 'data_da_emissao', 'data_do_vencimento', 'observacao',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'data_da_emissao'    => 'date',
        'data_do_vencimento' => 'date',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'veiculo_id'); }
}
