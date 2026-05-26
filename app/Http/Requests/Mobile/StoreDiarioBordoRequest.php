<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiarioBordoRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        $companyId = \App\Helpers\CompanyContext::current()?->id;
        return [
            'veiculo_id'  => [
                'required_without:id_veiculo', 'nullable', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'id_veiculo'  => [
                'required_without:veiculo_id', 'nullable', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'data'        => ['required', 'date'],
            'responsavel' => ['nullable', 'string', 'max:255'],
            'descricao'   => ['required', 'string', 'min:3', 'max:5000'],
            'observacao'  => ['nullable', 'string', 'max:2000'],
            'km_inicial'  => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'km_final'    => ['nullable', 'numeric', 'min:0', 'max:99999999', 'gte:km_inicial'],
            'hr_inicial'  => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'hr_final'    => ['nullable', 'numeric', 'min:0', 'max:9999999', 'gte:hr_inicial'],
            // Ciclo (abertura/fechamento). Default ABERTO no controller se ausente.
            'ciclo_status' => ['nullable', 'string', 'in:ABERTO,FECHADO'],
        ];
    }

    public function messages(): array
    {
        return [
            'descricao.min' => 'Descreva o registro com pelo menos 3 caracteres.',
            'km_final.gte'  => 'A quilometragem final não pode ser menor que a inicial.',
            'hr_final.gte'  => 'O horímetro final não pode ser menor que o inicial.',
            '*.exists'      => 'O veículo informado não pertence à sua empresa.',
        ];
    }
}
