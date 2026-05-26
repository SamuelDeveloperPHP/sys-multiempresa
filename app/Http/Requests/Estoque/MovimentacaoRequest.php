<?php

namespace App\Http\Requests\Estoque;

use App\Helpers\CompanyContext;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Saldo;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MovimentacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $companyId = CompanyContext::current()?->id;

        $tiposEntrada = [Movimentacao::TIPO_ENTRADA, Movimentacao::TIPO_DEVOLUCAO];
        $tiposSaida   = [Movimentacao::TIPO_SAIDA];
        $tiposTransf  = [Movimentacao::TIPO_TRANSF_OUT];

        $tiposPermitidos = array_merge($tiposEntrada, $tiposSaida, $tiposTransf);

        $ehSaida = $this->input('tipo') === Movimentacao::TIPO_SAIDA;
        $ehTransf = $this->input('tipo') === Movimentacao::TIPO_TRANSF_OUT;

        return [
            'tipo' => ['required', Rule::in($tiposPermitidos)],

            'produto_id' => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'obra_id'    => [
                'required', 'integer',
                Rule::exists('obras', 'id')->where(fn ($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],

            'quantidade'     => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'valor_unitario' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'data_movimento' => ['required', 'date', 'before_or_equal:today'],
            'observacao'     => ['nullable', 'string', 'max:1000'],

            // Específicos por tipo
            'fornecedor_id'    => ['nullable', 'integer', Rule::exists('fornecedores', 'id')],
            'nota_fiscal'      => ['nullable', 'string', 'max:50'],
            'data_nota_fiscal' => ['nullable', 'date'],

            'obra_destino_id' => [
                Rule::requiredIf(fn () => $ehTransf),
                'nullable', 'integer', 'different:obra_id',
                Rule::exists('obras', 'id')->where(fn ($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],

            // ============= Validação de SAÍDA (FASE 7) =============
            // SAÍDA exige IDENTIFICAÇÃO + SENHA do retirante. Almoxarife
            // não pode dar baixa anônima de material.
            'retirante_user_id' => [
                Rule::requiredIf(fn () => $ehSaida),
                'nullable', 'integer',
                Rule::exists('users', 'id'), // users não tem soft delete
            ],
            'retirante_senha' => [
                Rule::requiredIf(fn () => $ehSaida),
                'nullable', 'string',
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($v->errors()->any()) return; // não duplica erros

            // Para SAIDA / TRANSF_OUT: valida saldo suficiente
            $tipo = $this->input('tipo');
            if (in_array($tipo, [Movimentacao::TIPO_SAIDA, Movimentacao::TIPO_TRANSF_OUT], true)) {
                $saldo = Saldo::where('produto_id', $this->input('produto_id'))
                    ->where('obra_id', $this->input('obra_id'))
                    ->value('quantidade') ?? 0;

                if ((float) $saldo < (float) $this->input('quantidade')) {
                    $v->errors()->add(
                        'quantidade',
                        sprintf(
                            'Saldo insuficiente. Disponível: %s (solicitado: %s).',
                            number_format((float) $saldo, 3, ',', '.'),
                            number_format((float) $this->input('quantidade'), 3, ',', '.')
                        )
                    );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'obra_destino_id.required' => 'Em transferências, a obra de destino é obrigatória.',
            'obra_destino_id.different' => 'A obra de destino deve ser diferente da origem.',
            'data_movimento.before_or_equal' => 'Não é permitido lançar movimentação com data futura.',
            'retirante_user_id.required' => 'Identifique o funcionário que está retirando o material.',
            'retirante_senha.required'   => 'Senha do retirante é obrigatória para validar a saída.',
        ];
    }
}
