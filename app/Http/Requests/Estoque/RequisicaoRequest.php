<?php

namespace App\Http\Requests\Estoque;

use App\Helpers\CompanyContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validação ao CRIAR ou EDITAR uma requisição em status RASCUNHO.
 *
 * Para mudanças de status (enviar, aprovar, rejeitar, atender, cancelar),
 * cada endpoint tem sua própria validação inline.
 */
class RequisicaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $companyId = CompanyContext::current()?->id;

        return [
            'obra_origem_id' => [
                'required', 'integer',
                Rule::exists('obras', 'id')->where(fn ($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'obra_destino_id' => [
                'nullable', 'integer',
                Rule::exists('obras', 'id')->where(fn ($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'data_solicitacao'       => ['required', 'date'],
            'observacao_solicitante' => ['nullable', 'string', 'max:2000'],

            // Itens
            'itens'                          => ['required', 'array', 'min:1'],
            'itens.*.produto_id'             => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'itens.*.quantidade_solicitada'  => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'itens.*.valor_unitario_estimado' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'itens.*.observacao'             => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'itens.required' => 'A requisição precisa ter pelo menos 1 item.',
            'itens.min'      => 'A requisição precisa ter pelo menos 1 item.',
        ];
    }
}
