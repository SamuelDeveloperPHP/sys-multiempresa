<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDiarioBordoRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        return [
            'data'        => ['sometimes', 'required', 'date'],
            'responsavel' => ['nullable', 'string', 'max:255'],
            'descricao'   => ['sometimes', 'required', 'string', 'min:3', 'max:5000'],
            'observacao'  => ['nullable', 'string', 'max:2000'],
            'km_inicial'  => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'km_final'    => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'hr_inicial'  => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'hr_final'    => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'ciclo_status' => ['nullable', 'string', 'in:ABERTO,FECHADO'],
        ];
    }
}
