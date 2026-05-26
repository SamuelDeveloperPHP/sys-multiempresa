<?php

namespace App\Http\Requests\Estoque;

use App\Helpers\CompanyContext;
use App\Models\Estoque\Devolucao;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DevolucaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $companyId = CompanyContext::current()?->id;

        return [
            'funcionario_user_id' => ['required', 'integer', Rule::exists('users', 'id')], // users sem soft delete
            'produto_id'          => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'obra_id'             => [
                'required', 'integer',
                Rule::exists('obras', 'id')->where(fn ($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'movimentacao_saida_id' => [
                'nullable', 'integer',
                Rule::exists('estoque_movimentacoes', 'id')->where(fn ($q) => $q->where('tipo', 'SAIDA')),
            ],
            'quantidade'      => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'valor_unitario'  => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'estado_material' => ['required', Rule::in([
                Devolucao::ESTADO_NOVO, Devolucao::ESTADO_USADO_OK, Devolucao::ESTADO_AVARIADO,
            ])],
            'motivo'      => ['nullable', 'string', 'max:500'],
            'observacao'  => ['nullable', 'string', 'max:1000'],
        ];
    }
}
