<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Funcionario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Gerenciamento da `senha_retirada` do FUNCIONÁRIO.
 *
 * - Cadastro inicial: o operador (almoxarife/admin) pode cadastrar a senha
 *   para um funcionário que ainda não tem (campo único exigido = senha).
 *
 * - Alteração: exige confirmação por CPF do funcionário (porta o pattern do
 *   legacy `cad_edi_password_func`: se já existe senha, pede CPF para
 *   confirmar a identidade antes de sobrescrever).
 *
 * - Remoção: limpa a senha (só admin pode — protegemos via gate na rota).
 *
 * Não há endpoint público de "esqueci minha senha" — só o cadastro pelo
 * almoxarife. Isso é intencional: a senha é simples (4–8 dígitos) e o
 * funcionário a recebe na obra.
 */
class FuncionarioSenhaRetiradaController extends Controller
{
    /**
     * PUT /admin/funcionarios/{funcionario}/senha-retirada
     */
    public function update(Request $request, Funcionario $funcionario): JsonResponse
    {
        // Multi-tenant: só permite mexer em funcionário da empresa atual
        $companyId = CompanyContext::current()?->id;
        if ($companyId && $funcionario->company_id && (int) $funcionario->company_id !== (int) $companyId) {
            return response()->json(['message' => 'Funcionário não pertence à empresa atual.'], 403);
        }

        $isUpdate = !empty($funcionario->senha_retirada);

        $rules = [
            'senha' => ['required', 'string', 'min:4', 'max:32'],
        ];

        // Se já existe senha, exige CPF do funcionário como confirmação
        // (mesmo pattern do legacy show-scripts.blade.php > handleSenhaEstoque).
        if ($isUpdate) {
            $rules['cpf'] = ['required', 'string'];
        }

        $data = $request->validate($rules);

        if ($isUpdate) {
            // Compara CPFs normalizados (só dígitos)
            $cpfInformado = preg_replace('/\D+/', '', (string) $data['cpf']);
            $cpfReal      = preg_replace('/\D+/', '', (string) ($funcionario->cpf ?? ''));
            if ($cpfReal === '' || $cpfInformado !== $cpfReal) {
                throw ValidationException::withMessages([
                    'cpf' => 'CPF informado não confere com o cadastro do funcionário.',
                ]);
            }
        }

        $funcionario->senha_retirada = $data['senha']; // será hasheada pelo cast
        $funcionario->save();

        Log::info('senha_retirada atualizada', [
            'funcionario_id' => $funcionario->id,
            'operador'       => $request->user()?->email,
            'modo'           => $isUpdate ? 'alteracao' : 'cadastro',
        ]);

        return response()->json([
            'ok'      => true,
            'modo'    => $isUpdate ? 'atualizada' : 'cadastrada',
            'message' => $isUpdate
                ? 'Senha de retirada atualizada com sucesso.'
                : 'Senha de retirada cadastrada com sucesso.',
        ]);
    }

    /**
     * DELETE /admin/funcionarios/{funcionario}/senha-retirada
     *  Remove a senha (revoga o acesso de retirada do funcionário).
     */
    public function destroy(Funcionario $funcionario): JsonResponse
    {
        $companyId = CompanyContext::current()?->id;
        if ($companyId && $funcionario->company_id && (int) $funcionario->company_id !== (int) $companyId) {
            return response()->json(['message' => 'Funcionário não pertence à empresa atual.'], 403);
        }

        $funcionario->senha_retirada = null;
        $funcionario->save();

        return response()->json([
            'ok'      => true,
            'message' => 'Senha de retirada removida.',
        ]);
    }

    /**
     * POST /admin/estoque/validar-funcionario
     *  Valida uma senha de retirada e retorna o funcionário se confere.
     *  Usado pelo form de movimentação (SAIDA / DEVOLUCAO).
     *
     *  Aplica rate limiting agressivo (5 tentativas/5min por chave operador+funcionário).
     */
    public function validarSenha(Request $request): JsonResponse
    {
        $data = $request->validate([
            'funcionario_id' => ['required', 'integer'],
            'senha'          => ['required', 'string'],
        ]);

        $operador = $request->user()?->id ?? 0;
        $key = "estoque-retirada-func:{$operador}:{$data['funcionario_id']}";

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'senha' => "Muitas tentativas. Aguarde {$seconds}s e tente novamente.",
            ]);
        }

        $companyId = CompanyContext::current()?->id;
        $funcionario = Funcionario::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->find($data['funcionario_id']);

        if (!$funcionario) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'funcionario_id' => 'Funcionário não encontrado.',
            ]);
        }

        if (empty($funcionario->senha_retirada)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'senha' => 'Funcionário sem senha de retirada cadastrada. Cadastre antes.',
            ]);
        }

        if (!Hash::check($data['senha'], $funcionario->senha_retirada)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'senha' => 'Senha incorreta.',
            ]);
        }

        // Senha correta: zera contador e devolve dados públicos do funcionário
        RateLimiter::clear($key);

        return response()->json([
            'ok'         => true,
            'funcionario' => [
                'id'        => $funcionario->id,
                'nome'      => $funcionario->nome,
                'matricula' => $funcionario->matricula,
                'cpf'       => $funcionario->cpf,
            ],
        ]);
    }

    /**
     * GET /admin/estoque/buscar-funcionarios-retirada?q=...
     *  Autocomplete de funcionários habilitados (com senha cadastrada).
     *
     *  Mostra todos os funcionários ativos da empresa atual. O front
     *  destaca visualmente quem AINDA não tem senha (operador pode
     *  clicar para cadastrar antes de continuar).
     */
    public function buscar(Request $request): JsonResponse
    {
        $q      = trim((string) $request->input('q', ''));
        $obraId = $request->input('obra_id');

        // Sem texto E sem obra → não lista (evita despejar a empresa toda).
        // Com obra → lista os funcionários daquela obra (mesmo sem texto).
        if (mb_strlen($q) < 2 && !$obraId) {
            return response()->json(['data' => []]);
        }

        $companyId = CompanyContext::current()?->id;

        $funcionarios = Funcionario::query()
            ->when($companyId, fn ($w) => $w->where('company_id', $companyId))
            ->when($obraId, fn ($w) => $w->where('id_obra', $obraId))
            ->when(mb_strlen($q) >= 2, fn ($w) => $w->where(function ($s) use ($q) {
                $s->where('nome', 'like', "%{$q}%")
                  ->orWhere('matricula', 'like', "%{$q}%")
                  ->orWhere('cpf', 'like', "%{$q}%");
            }))
            // Exclui apenas quem tem data de demissão preenchida (a coluna
            // `situacao` aqui guarda um código, não o texto "Ativo").
            ->whereNull('data_demissao')
            ->orderBy('nome')
            ->limit(50)
            ->get(['id', 'nome', 'matricula', 'cpf', 'imagem_usuario',
                   'senha_retirada', 'id_obra']);

        // Garante que senha_retirada não vaza — só envia flag tem_senha
        $payload = $funcionarios->map(fn ($f) => [
            'id'             => $f->id,
            'nome'           => $f->nome,
            'matricula'      => $f->matricula,
            'cpf'            => $f->cpf,
            'imagem_usuario' => $f->imagem_usuario,
            'tem_senha'      => !empty($f->senha_retirada),
            'id_obra'        => $f->id_obra,
        ]);

        return response()->json(['data' => $payload]);
    }
}
