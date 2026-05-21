<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateChecklistServicoRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        return [
            'data'             => ['sometimes', 'date'],
            'responsavel'      => ['nullable', 'string', 'max:255'],
            'km_atual'         => ['nullable', 'numeric', 'min:0'],
            'hr_atual'         => ['nullable', 'numeric', 'min:0'],
            'observacao_geral' => ['nullable', 'string', 'max:2000'],
            'respostas'        => ['sometimes', 'array', 'max:200'],
            'respostas.*.item_id'   => ['required_with:respostas', 'integer'],
            'respostas.*.item_nome' => ['nullable', 'string', 'max:500'],
            'respostas.*.ok'        => ['nullable', 'boolean'],
            'respostas.*.obs'       => ['nullable', 'string', 'max:1000'],
        ];
    }
}
