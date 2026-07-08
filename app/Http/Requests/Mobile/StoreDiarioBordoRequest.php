<?php

namespace App\Http\Requests\Mobile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiarioBordoRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        $companyId = \App\Helpers\CompanyContext::current()?->id;
        return [
            // Idempotência: UUID gerado no device; o servidor deduplica por ele.
            'client_uuid' => ['nullable', 'string', 'max:64'],
            'veiculo_id'  => [
                'required_without:id_veiculo', 'nullable', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'id_veiculo'  => [
                'required_without:veiculo_id', 'nullable', 'integer',
                Rule::exists('veiculos', 'id')->where(fn($q) => $companyId ? $q->where('company_id', $companyId) : $q),
            ],
            'data'        => ['required', 'date'],
            'responsavel' => ['nullable', 'string', 'max:255'],
            // O app mobile envia 'descricao_atividade' (nome da coluna real);
            // clientes antigos enviam 'descricao'. Aceita qualquer um dos dois —
            // exigir só 'descricao' fazia TODO create do PWA falhar com 422.
            'descricao'            => ['required_without:descricao_atividade', 'nullable', 'string', 'min:3', 'max:5000'],
            'descricao_atividade'  => ['required_without:descricao', 'nullable', 'string', 'min:3', 'max:5000'],
            'observacao'  => ['nullable', 'string', 'max:2000'],
            'horario_inicial' => ['nullable', 'date'],
            'km_inicial'  => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'km_anterior' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'km_final'    => ['nullable', 'numeric', 'min:0', 'max:99999999', 'gte:km_inicial'],
            'hr_inicial'  => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'hr_anterior' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'hr_final'    => ['nullable', 'numeric', 'min:0', 'max:9999999', 'gte:hr_inicial'],
            // Ciclo (abertura/fechamento). Default ABERTO no controller se ausente.
            'ciclo_status' => ['nullable', 'string', 'in:ABERTO,FECHADO'],
            // Foto da abertura (data URL) — vira arquivo no servidor
            'arquivo_app_data_url' => [
                'nullable', 'string', 'max:' . StoreChecklistServicoRequest::FOTO_MAX_CHARS,
                'regex:/^data:image\/(jpeg|jpg|png|webp);base64,/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'descricao.required_without'           => 'Descreva a atividade realizada.',
            'descricao_atividade.required_without' => 'Descreva a atividade realizada.',
            'descricao.min'           => 'Descreva o registro com pelo menos 3 caracteres.',
            'descricao_atividade.min' => 'Descreva o registro com pelo menos 3 caracteres.',
            'km_final.gte'  => 'A quilometragem final não pode ser menor que a inicial.',
            'hr_final.gte'  => 'O horímetro final não pode ser menor que o inicial.',
            '*.exists'      => 'O veículo informado não pertence à sua empresa.',
            'arquivo_app_data_url.regex' => 'Foto em formato inválido (esperado data URL de imagem).',
            'arquivo_app_data_url.max'   => 'Foto excede o tamanho máximo permitido.',
        ];
    }
}
