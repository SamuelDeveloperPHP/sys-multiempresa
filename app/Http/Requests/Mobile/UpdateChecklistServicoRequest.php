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
            'ciclo_status'     => ['nullable', 'string', 'in:ABERTO,FECHADO'],
            'tipo'             => ['nullable', 'string', 'in:ABERTURA,ENCERRAMENTO'],
            'respostas'        => ['sometimes', 'array', 'max:200'],
            'respostas.*.item_id'   => ['required_with:respostas', 'integer'],
            'respostas.*.item_nome' => ['nullable', 'string', 'max:500'],
            'respostas.*.ok'        => ['nullable', 'boolean'],
            'respostas.*.obs'       => ['nullable', 'string', 'max:1000'],
            // Ver StoreChecklistServicoRequest: base64 é extraído para arquivo;
            // foto_path preserva fotos já extraídas em edições.
            'respostas.*.foto_data_url' => [
                'nullable', 'string', 'max:' . StoreChecklistServicoRequest::FOTO_MAX_CHARS,
                'regex:/^data:image\/(jpeg|jpg|png|webp);base64,/',
            ],
            'respostas.*.foto_path' => [
                'nullable', 'string', 'max:255',
                'regex:/^uploads\/aplicativo\/checklist_servicos\//',
            ],
        ];
    }

    /**
     * Não conformidade exige evidência (mesma regra do Store).
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (!$this->has('respostas')) {
                return;
            }
            foreach ((array) $this->input('respostas', []) as $i => $r) {
                $ok = filter_var($r['ok'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                $obs = trim((string) ($r['obs'] ?? ''));
                if ($ok === false && $obs === '') {
                    $v->errors()->add(
                        "respostas.{$i}.obs",
                        'Item não conforme exige observação descrevendo o problema.'
                    );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'respostas.*.foto_data_url.regex' => 'Foto em formato inválido (esperado data URL de imagem).',
            'respostas.*.foto_data_url.max' => 'Foto excede o tamanho máximo permitido.',
        ];
    }
}
