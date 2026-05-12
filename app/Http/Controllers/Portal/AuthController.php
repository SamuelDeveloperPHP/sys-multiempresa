<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use Inertia\Inertia;
use Illuminate\Support\Facades\Session;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Portal/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $throttleKey = 'client-login:'. $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Ataque bloqueado. O acesso está suspenso temporariamente. Tente novamente em {$seconds} segundos.",
            ]);
        }

        if (Auth::guard('client')->attempt($request->only('email', 'password'))) {
            RateLimiter::clear($throttleKey);
            $request->session()->regenerate();
            
            $client = Auth::guard('client')->user();
            if ($client->google2fa_secret) {
                return redirect()->route('portal.2fa.challenge');
            }

            return redirect()->route('portal.dashboard');
        }

        RateLimiter::hit($throttleKey, 600); // Penalti de 10 minutos após 3 erros
        
        throw ValidationException::withMessages([
            'email' => 'As credenciais não coincidem com nossos registros.',
        ]);
    }

    public function show2faChallenge()
    {
        return Inertia::render('Portal/TwoFactorChallenge');
    }

    public function verify2fa(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $client = Auth::guard('client')->user();
        $google2fa = new Google2FA();
        
        $valid = $google2fa->verifyKey($client->google2fa_secret, $request->code);

        if ($valid) {
            Session::put('client_2fa_verified', true);
            return redirect()->route('portal.dashboard');
        }

        throw ValidationException::withMessages([
            'code' => 'O código 2FA é inválido ou expirou.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('client')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('portal.login');
    }
}
