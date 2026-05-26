<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChecklistServicoRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        $companyId = \App\Helpers\CompanyContext::current()?->id;
        return [
            'veiculo_id'       => [
                'required', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'checklist_id'     => ['required', 'integer', 'exists:veiculo_checklist,id'],
            'data'             => ['required', 'date'],
            'responsavel'      => ['nullable', 'string', 'max:255'],
            'km_atual'         => ['nullable', 'numeric', 'min:0'],
            'hr_atual'         => ['nullable', 'numeric', 'min:0'],
            'observacao_geral' => ['nullable', 'string', 'max:2000'],
            // Ciclo (abertura/encerramento). 'tipo' é o sinal do front legado.
            'ciclo_status'     => ['nullable', 'string', 'in:ABERTO,FECHADO'],
            'tipo'             => ['nullable', 'string', 'in:ABERTURA,ENCERRAMENTO'],
            'respostas'        => ['required', 'array', 'min:1', 'max:200'],
            'respostas.*.item_id'   => ['required', 'integer'],
            'respostas.*.item_nome' => ['nullable', 'string', 'max:500'],
            'respostas.*.ok'        => ['nullable', 'boolean'],
            'respostas.*.obs'       => ['nullable', 'string', 'max:1000'],
        ];
    }
}
