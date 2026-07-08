<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAbastecimentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'data'           => ['sometimes', 'required', 'date'],
            'fornecedor'     => ['nullable', 'string', 'max:255'],
            'combustivel'    => ['sometimes', 'required', 'string', 'max:50'],
            'quantidade'     => ['sometimes', 'required', 'numeric', 'min:0.01', 'max:99999.99'],
            'valor_do_litro' => ['nullable', 'numeric', 'min:0', 'max:999.9999'],
            'valor_total'    => ['sometimes', 'required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'km_atual'       => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'hr_atual'       => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'observacao'     => ['nullable', 'string', 'max:2000'],
            // Troca da foto do comprovante (ver StoreAbastecimentoRequest)
            'arquivo_app_data_url' => [
                'nullable', 'string', 'max:' . StoreChecklistServicoRequest::FOTO_MAX_CHARS,
                'regex:/^data:image\/(jpeg|jpg|png|webp);base64,/',
            ],
        ];
    }
}
