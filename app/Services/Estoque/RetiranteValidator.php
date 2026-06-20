<?php

namespace App\Services\Estoque;

use App\Helpers\CompanyContext;
use App\Models\Funcionario;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Centraliza a validação de senha do retirante para os 4 fluxos de
 * movimentação que dependem dela: saída, devolução, transferência (futuro
 * — hoje só saída exige) e o fluxo rápido de devolução.
 *
 * Estratégia anti brute-force: 5 tentativas em 5 minutos por chave
 * (operador, alvo). A chave é distinta para funcionário e usuário, então
 * tentativas em alvos diferentes não se acumulam.
 */
class RetiranteValidator
{
    /**
     * Valida que o `funcionario_id` informado existe na empresa atual,
     * tem `senha_retirada` cadastrada e a senha bate.
     *
     * @param  string  $errorField campo onde injetar o erro de senha
     *                              (varia entre forms: 'retirante_senha',
     *                              'senha_retirante', etc.)
     * @throws ValidationException se algo falhar
     */
    public function validarFuncionario(int $funcionarioId, string $senha, string $errorField = 'senha'): Funcionario
    {
        $operador = Auth::id() ?? 0;
        $key = "estoque-retirada-func:{$operador}:{$funcionarioId}";

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                $errorField => "Muitas tentativas. Aguarde {$seconds}s e tente novamente.",
            ]);
        }

        $companyId = CompanyContext::current()?->id;
        $func = Funcionario::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->find($funcionarioId);

        if (!$func) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'funcionario_id' => 'Funcionário não encontrado.',
            ]);
        }

        if (empty($func->senha_retirada)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                $errorField => 'Funcionário sem senha de retirada cadastrada.',
            ]);
        }

        if (!Hash::check($senha, $func->senha_retirada)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                $errorField => 'Senha do funcionário incorreta.',
            ]);
        }

        RateLimiter::clear($key);
        $func->forceFill(['data_ultima_retirada' => now()])->save();

        return $func;
    }

    /**
     * Mesmo que `validarFuncionario`, mas para Usuário do sistema (caminho
     * legacy: o retirante tem login).
     */
    public function validarUsuario(int $userId, string $senha, string $errorField = 'senha'): User
    {
        $operador = Auth::id() ?? 0;
        $key = "estoque-retirada-user:{$operador}:{$userId}";

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                $errorField => "Muitas tentativas. Aguarde {$seconds}s e tente novamente.",
            ]);
        }

        $user = User::find($userId);
        if (!$user) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'retirante_user_id' => 'Usuário não encontrado.',
            ]);
        }
        if (!Hash::check($senha, $user->password)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                $errorField => 'Senha do usuário incorreta.',
            ]);
        }

        RateLimiter::clear($key);
        return $user;
    }
}
