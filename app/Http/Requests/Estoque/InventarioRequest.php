<?php

namespace App\Http\Requests\Estoque;

use App\Helpers\CompanyContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validação ao ABRIR um novo inventário.
 *
 * Atualização de itens (saldo_contado) tem validação inline no controller.
 */
class InventarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $companyId = CompanyContext::current()?->id;

        return [
            'obra_id' => [
                'required', 'integer',
                Rule::exists('obras', 'id')->where(fn ($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'data_inicio' => ['required', 'date', 'before_or_equal:today'],
            'observacao'  => ['nullable', 'string', 'max:2000'],

            // Filtro opcional: inventariar apenas determinada categoria/produtos
            'categoria_id'  => ['nullable', 'integer', Rule::exists('estoque_categorias', 'id')],
            'apenas_com_saldo' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'data_inicio.before_or_equal' => 'Não é permitido abrir inventário com data futura.',
        ];
    }
}
