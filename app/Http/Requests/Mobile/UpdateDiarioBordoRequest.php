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
            'descricao'            => ['sometimes', 'nullable', 'string', 'min:3', 'max:5000'],
            'descricao_atividade'  => ['sometimes', 'nullable', 'string', 'min:3', 'max:5000'],
            'observacao'  => ['nullable', 'string', 'max:2000'],
            'km_inicial'  => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'km_final'    => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'hr_inicial'  => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'hr_final'    => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'ciclo_status' => ['nullable', 'string', 'in:ABERTO,FECHADO'],
            // ===== Campos do ENCERRAMENTO (Close.jsx) — antes eram descartados
            // pela validação: horas trabalhadas, observação e foto se perdiam =====
            'horario_final'             => ['nullable', 'date'],
            'horas_trabalhadas_minutos' => ['nullable', 'integer', 'min:0', 'max:14400'],
            'observacao_fechamento'     => ['nullable', 'string', 'max:2000'],
            'arquivo_fechamento_data_url' => [
                'nullable', 'string', 'max:' . StoreChecklistServicoRequest::FOTO_MAX_CHARS,
                'regex:/^data:image\/(jpeg|jpg|png|webp);base64,/',
            ],
            // Troca da foto de abertura (edição)
            'arquivo_app_data_url' => [
                'nullable', 'string', 'max:' . StoreChecklistServicoRequest::FOTO_MAX_CHARS,
                'regex:/^data:image\/(jpeg|jpg|png|webp);base64,/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'arquivo_fechamento_data_url.regex' => 'Foto em formato inválido (esperado data URL de imagem).',
            'arquivo_fechamento_data_url.max'   => 'Foto excede o tamanho máximo permitido.',
            'arquivo_app_data_url.regex' => 'Foto em formato inválido (esperado data URL de imagem).',
            'arquivo_app_data_url.max'   => 'Foto excede o tamanho máximo permitido.',
        ];
    }
}
