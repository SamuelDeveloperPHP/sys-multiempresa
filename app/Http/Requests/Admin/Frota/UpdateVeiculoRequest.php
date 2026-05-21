<?php

namespace App\Http\Requests\Admin\Frota;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVeiculoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'obra_id'         => $this->input('obra_id')         ?: null,
            'id_categoria'    => $this->input('id_categoria')    ?: null,
            'id_subcategoria' => $this->input('id_subcategoria') ?: null,
            'id_preventiva'   => $this->input('id_preventiva')   ?: null,
            'tipo_km'         => (bool) $this->input('tipo_km', false),
            'tipo_hr'         => (bool) $this->input('tipo_hr', false),
            'tipo_tempo'      => (bool) $this->input('tipo_tempo', false),
        ]);
    }

    public function rules(): array
    {
        return [
            'prefixo'              => 'required|string|max:60',
            'obra_id'              => 'nullable|exists:obras,id',
            'id_categoria'         => 'nullable|exists:veiculo_categorias,id',
            'id_subcategoria'      => 'nullable|exists:veiculo_subcategorias,id',
            'id_preventiva'        => 'nullable|exists:veiculo_preventivas,id',

            'tipo'                 => 'nullable|string|max:30',
            'placa'                => 'nullable|string|max:12',
            'modelo'               => 'nullable|string|max:120',
            'marca'                => 'nullable|string|max:120',
            'ano'                  => 'nullable|integer|min:1900|max:2100',
            'veiculo'              => 'nullable|string|max:191',

            'tipo_km'              => 'boolean',
            'tipo_hr'              => 'boolean',
            'tipo_tempo'           => 'boolean',

            'valor_fipe'           => 'nullable|numeric|min:0',
            'valor_aquisicao'      => 'nullable|numeric|min:0',
            'valor_mercado'        => 'nullable|numeric|min:0',
            'codigo_fipe'          => 'nullable|string|max:30',
            'fipe_mes_referencia'  => 'nullable|string|max:30',
            'mes_aquisicao'        => 'nullable|string|max:30',

            'nun_serie_chassi'     => 'nullable|string|max:60',
            'renavam'              => 'nullable|string|max:30',
            'horimetro_inicial'    => 'nullable|integer|min:0',
            'quilometragem_inicial'=> 'nullable|integer|min:0',

            'observacao'           => 'nullable|string',
            'situacao'             => 'nullable|string|max:30',

            'imagem'               => 'nullable|file|image|max:5120',
        ];
    }
}
