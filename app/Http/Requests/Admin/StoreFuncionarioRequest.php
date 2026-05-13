<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreFuncionarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Converte strings vazias dos selects opcionais para null antes da validação,
     * para que a regra `exists:` não falhe com '' (Inertia envia string vazia por padrão).
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'id_obra'   => $this->input('id_obra')   ?: null,
            'id_funcao' => $this->input('id_funcao') ?: null,
            'id_setor'  => $this->input('id_setor')  ?: null,
        ]);
    }

    public function rules(): array
    {
        return [
            'nome' => 'required|string|max:191',
            'cpf' => 'nullable|string|max:20|unique:funcionarios,cpf',
            'matricula' => 'nullable|string|max:60',
            'status' => 'required|string|max:30',
            'id_obra' => 'nullable|exists:obras,id',
            'id_funcao' => 'nullable|exists:funcao_funcionarios,id',
            'id_setor' => 'nullable|exists:funcionarios_setor,id',
            'email' => 'nullable|email|max:191',
            'rg' => 'nullable|string|max:30',
            'celular' => 'nullable|string|max:20',
            'cep' => 'nullable|string|max:15',
            'endereco' => 'nullable|string|max:191',
            'numero' => 'nullable|string|max:20',
            'bairro' => 'nullable|string|max:100',
            'cidade' => 'nullable|string|max:100',
            'estado' => 'nullable|string|max:2',
            'nome_mae' => 'nullable|string|max:191',
            'genero' => 'nullable|string|max:20',
            'pis' => 'nullable|string|max:30',
            'estado_civil' => 'nullable|string|max:30',
            'dependentes' => 'nullable|integer',
            'data_adminssao' => 'nullable|date',
            'data_demissao' => 'nullable|date',
            'afastado' => 'nullable|boolean',
            'companies' => 'required|array',
            'companies.*' => 'exists:companies,id',

            // Permissões e Acesso ao Sistema
            'create_user' => 'nullable|boolean',
            'user_email' => 'nullable|email|max:255',
            'user_password' => 'nullable|string|min:8',
            'user_type' => 'nullable|string|in:user,admin',
            'permissions' => 'nullable|array',
            'permissions.*.module_id' => 'nullable|integer|exists:modules,id',
        ];
    }
}
