<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChecklistServicoRequest extends FormRequest
{
    // Data URL base64: ~2M chars ≈ 1,5 MB binário por foto. A câmera do app
    // captura a 0.7/1600px (~200–500 KB), então o teto é folgado sem permitir
    // payloads abusivos na coluna/requisição.
    public const FOTO_MAX_CHARS = 2000000;

    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        $companyId = \App\Helpers\CompanyContext::current()?->id;
        return [
            // Idempotência: UUID gerado no device; o servidor deduplica por ele.
            'client_uuid'      => ['nullable', 'string', 'max:64'],
            'veiculo_id'       => [
                'required', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            // Amarrado ao veículo: impede usar template de outro veículo/empresa.
            'checklist_id'     => [
                'required', 'integer',
                Rule::exists('veiculo_checklist', 'id')
                    ->where(fn($q) => $q->where('id_veiculo', (int) $this->input('veiculo_id'))),
            ],
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
            // Foto do item: data URL de imagem, com teto de tamanho. O controller
            // extrai para arquivo (foto_path) — o JSON nunca persiste o base64.
            'respostas.*.foto_data_url' => [
                'nullable', 'string', 'max:' . self::FOTO_MAX_CHARS,
                'regex:/^data:image\/(jpeg|jpg|png|webp);base64,/',
            ],
            // Caminho de foto já extraída (reenvio/edição) — restrito ao diretório
            // de uploads do checklist para não referenciar arquivos arbitrários.
            'respostas.*.foto_path' => [
                'nullable', 'string', 'max:255',
                'regex:/^uploads\/aplicativo\/checklist_servicos\//',
            ],
        ];
    }

    /**
     * Não conformidade exige evidência: item com ok=false precisa de observação.
     * (Espelho da validação do front — garante a regra mesmo via API direta.)
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
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
            'checklist_id.exists' => 'O checklist informado não pertence a este veículo.',
            'respostas.*.foto_data_url.regex' => 'Foto em formato inválido (esperado data URL de imagem).',
            'respostas.*.foto_data_url.max' => 'Foto excede o tamanho máximo permitido.',
        ];
    }
}
