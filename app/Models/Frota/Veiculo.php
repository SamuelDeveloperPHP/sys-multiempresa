<?php

namespace App\Models\Frota;

use App\Models\Obra;
use App\Models\Traits\Tenantable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Veiculo extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'veiculos';

    protected $fillable = [
        'company_id', 'obra_id',
        'prefixo', 'tipo', 'placa', 'modelo', 'marca', 'ano', 'imagem',
        'tipo_km', 'tipo_hr',
        'data_sincronizacao', 'sync_status',
    ];

    protected $casts = [
        'tipo_km' => 'boolean',
        'tipo_hr' => 'boolean',
        'data_sincronizacao' => 'datetime',
    ];

    public function obra() { return $this->belongsTo(Obra::class); }
    public function locacoes() { return $this->hasMany(VeiculoLocacao::class, 'veiculo_id'); }
    public function abastecimentos() { return $this->hasMany(VeiculoAbastecimento::class, 'veiculo_id'); }
    public function horimetros() { return $this->hasMany(VeiculoHorimetro::class, 'veiculo_id'); }
    public function quilometragens() { return $this->hasMany(VeiculoQuilometragem::class, 'veiculo_id'); }
    public function diarioBordo() { return $this->hasMany(VeiculoDiarioBordo::class, 'id_veiculo'); }
    public function checklists() { return $this->hasMany(VeiculoChecklist::class, 'id_veiculo'); }
    public function preventivas() { return $this->hasMany(VeiculoPreventiva::class, 'id_veiculo'); }
}
