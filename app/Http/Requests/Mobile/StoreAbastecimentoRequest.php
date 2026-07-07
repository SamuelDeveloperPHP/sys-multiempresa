<?php

namespace App\Http\Requests\Mobile;

use App\Models\Frota\Veiculo;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAbastecimentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Validação de empresa é feita em prepareForValidation + rules
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $companyId = \App\Helpers\CompanyContext::current()?->id;

        return [
            // Idempotência: UUID gerado no device; o servidor deduplica por ele.
            'client_uuid'    => ['nullable', 'string', 'max:64'],
            'veiculo_id'     => [
                'required', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'id_obra'        => ['nullable', 'integer', 'exists:obras,id'],
            'data'           => ['required', 'date'],
            'fornecedor'     => ['nullable', 'string', 'max:255'],
            'combustivel'    => ['required', 'string', 'max:50'],
            'quantidade'     => ['required', 'numeric', 'min:0.01', 'max:99999.99'],
            'valor_do_litro' => ['nullable', 'numeric', 'min:0', 'max:999.9999'],
            'valor_total'    => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'km_atual'       => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'hr_atual'       => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'observacao'     => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'veiculo_id.exists' => 'O veículo informado não pertence à sua empresa.',
            'quantidade.min'    => 'A quantidade deve ser maior que zero.',
            'valor_total.min'   => 'O valor total deve ser maior que zero.',
        ];
    }
}
