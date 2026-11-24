<?php

namespace Tests;

use App\Models\User;
use App\Support\TwoFactorAuthentication;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Contracts\Auth\Authenticatable as UserContract;

abstract class TestCase extends BaseTestCase
{
    /**
     * actingAs representa uma sessão completamente autenticada nos testes.
     * Cenários que exercitam o desafio 2FA devem entrar pelo POST /login.
     */
    public function actingAs(UserContract $user, $guard = null)
    {
        parent::actingAs($user, $guard);

        if ($user instanceof User) {
            $this->withSession([
                TwoFactorAuthentication::SESSION_USER_KEY => $user->id,
                TwoFactorAuthentication::SESSION_TIME_KEY => now()->toIso8601String(),
                TwoFactorAuthentication::SESSION_TEST_COMPLETE_KEY => true,
            ]);
        }

        return $this;
    }
}
