<?php

namespace App\Http\Requests\Estoque;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $produtoId = $this->route('produto')?->id;

        return [
            // CATÁLOGO GLOBAL — categoria e fornecedor podem ser de qualquer empresa
            'categoria_id'         => ['nullable', 'integer', Rule::exists('estoque_categorias', 'id')],
            'fornecedor_padrao_id' => ['nullable', 'integer', Rule::exists('fornecedores', 'id')],

            'sku' => [
                'nullable', 'string', 'max:100',
                // SKU agora é único GLOBALMENTE (não por empresa)
                Rule::unique('estoque_produtos', 'sku')
                    ->ignore($produtoId)
                    ->whereNull('deleted_at'),
            ],
            'codigo_barras' => ['nullable', 'string', 'max:100'],
            'nome'          => ['required', 'string', 'max:250'],
            'marca'         => ['nullable', 'string', 'max:150'],
            'descricao'     => ['nullable', 'string', 'max:2000'],

            'unidade'        => ['required', 'string', 'max:20'],
            'peso_kg'        => ['nullable', 'numeric', 'min:0', 'max:999999.999'],

            'valor_unitario'        => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'valor_ultima_entrada'  => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],

            'estoque_minimo'  => ['nullable', 'numeric', 'min:0', 'max:999999.999'],
            'estoque_maximo'  => ['nullable', 'numeric', 'min:0', 'max:999999.999', 'gte:estoque_minimo'],

            'imagem' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'ativo'  => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'Já existe um produto com este SKU no catálogo global.',
            'estoque_maximo.gte' => 'O estoque máximo deve ser maior ou igual ao mínimo.',
        ];
    }
}
