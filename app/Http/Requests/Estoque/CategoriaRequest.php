<?php

namespace App\Http\Requests\Estoque;

use App\Models\Estoque\Categoria;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $categoriaId = $this->route('categoria')?->id;

        return [
            // CATÁLOGO GLOBAL — categoria pai pode ser qualquer uma
            'parent_id' => [
                'nullable', 'integer',
                Rule::exists('estoque_categorias', 'id'),
                function ($attribute, $value, $fail) use ($categoriaId) {
                    if ($value && $categoriaId && (int) $value === (int) $categoriaId) {
                        $fail('A categoria não pode ser pai de si mesma.');
                    }
                    if ($value && $categoriaId) {
                        $node = Categoria::find($value);
                        while ($node) {
                            if ((int) $node->id === (int) $categoriaId) {
                                $fail('Detectado ciclo na hierarquia. Escolha outro pai.');
                                return;
                            }
                            $node = $node->parent;
                        }
                    }
                },
            ],
            'nome'      => ['required', 'string', 'max:191'],
            'descricao' => ['nullable', 'string', 'max:500'],
            'ordem'     => ['nullable', 'integer', 'min:0', 'max:9999'],
            'ativo'     => ['nullable', 'boolean'],
        ];
    }
}
