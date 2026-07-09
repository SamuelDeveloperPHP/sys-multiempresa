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
        'id_categoria', 'id_subcategoria', 'id_preventiva',
        'prefixo', 'tipo', 'placa', 'modelo', 'marca', 'ano', 'imagem',
        'tipo_km', 'tipo_hr', 'tipo_tempo', 'id_combustivel_padrao',
        'veiculo',
        'valor_fipe', 'valor_aquisicao', 'valor_mercado',
        'codigo_fipe', 'fipe_mes_referencia', 'mes_aquisicao',
        'nun_serie_chassi', 'renavam',
        'horimetro_inicial', 'quilometragem_inicial',
        'observacao', 'situacao',
        'user_create', 'user_edit',
        'data_sincronizacao', 'sync_status',
    ];

    protected $casts = [
        'tipo_km'             => 'boolean',
        'tipo_hr'             => 'boolean',
        'tipo_tempo'          => 'boolean',
        'valor_fipe'          => 'decimal:2',
        'valor_aquisicao'     => 'decimal:2',
        'valor_mercado'       => 'decimal:2',
        'data_sincronizacao'  => 'datetime',
    ];

    public function obra()        { return $this->belongsTo(Obra::class); }
    public function categoria()   { return $this->belongsTo(VeiculoCategoria::class, 'id_categoria'); }
    public function subcategoria(){ return $this->belongsTo(VeiculoSubCategoria::class, 'id_subcategoria'); }
    public function preventiva()  { return $this->belongsTo(VeiculoPreventiva::class, 'id_preventiva'); }
    public function tipoVeiculo() { return $this->belongsTo(TiposVeiculo::class, 'tipo'); }
    public function combustivelPadrao() { return $this->belongsTo(Combustivel::class, 'id_combustivel_padrao'); }
    public function imagens()     { return $this->hasMany(VeiculoImagem::class, 'veiculo_id')->orderBy('ordem'); }

    public function locacoes()      { return $this->hasMany(VeiculoLocacao::class, 'veiculo_id'); }
    public function abastecimentos(){ return $this->hasMany(VeiculoAbastecimento::class, 'veiculo_id'); }
    public function horimetros()    { return $this->hasMany(VeiculoHorimetro::class, 'veiculo_id'); }
    public function quilometragens(){ return $this->hasMany(VeiculoQuilometragem::class, 'veiculo_id'); }
    public function diarioBordo()   { return $this->hasMany(VeiculoDiarioBordo::class, 'id_veiculo'); }
    public function checklists()    { return $this->hasMany(VeiculoChecklist::class, 'id_veiculo'); }
    public function preventivas()   { return $this->hasMany(VeiculoPreventiva::class, 'id_veiculo'); }
    public function preventivasItens()      { return $this->hasMany(VeiculoPreventivaItem::class, 'id_veiculo'); }
    public function preventivasRealizadas() { return $this->hasMany(VeiculoPreventivaItemRealizada::class, 'id_veiculo'); }
    public function manutencoes()   { return $this->hasMany(VeiculoManutencao::class, 'veiculo_id'); }
    public function ipvas()         { return $this->hasMany(VeiculoIpva::class, 'veiculo_id'); }
    public function seguros()       { return $this->hasMany(VeiculoSeguro::class, 'veiculo_id'); }
    public function docsLegais()    { return $this->hasMany(VeiculoDocLegal::class, 'id_veiculo'); }
    public function docsTecnicos()  { return $this->hasMany(VeiculoDocTecnico::class, 'id_veiculo'); }

    public function locacaoAtual()
    {
        return $this->hasOne(VeiculoLocacao::class, 'veiculo_id')
                    ->whereNull('data_fim')
                    ->latest('data_inicio');
    }
}
