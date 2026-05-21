<?php

namespace App\Models\Frota;

use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VeiculoDocTecnico extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculos_docs_tecnicos';

    protected $fillable = [
        'company_id', 'id_veiculo',
        'id_tipo_veiculo', 'id_doc_tecnico',
        'nome_documento', 'arquivo',
        'data_documento', 'validade', 'data_validade',
        'status',
        'user_create', 'user_edit',
    ];

    protected $casts = [
        'data_documento' => 'date',
        'data_validade'  => 'date',
        'validade'       => 'integer',
    ];

    public function veiculo() { return $this->belongsTo(Veiculo::class, 'id_veiculo'); }

    public function getDiferencaDiasAttribute(): ?int
    {
        if (!$this->data_validade) return null;
        return (int) now()->diffInDays($this->data_validade, false);
    }
}
