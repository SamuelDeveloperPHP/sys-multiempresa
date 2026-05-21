<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => \Illuminate\Support\Facades\Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Verifica o usuário ANTES do attempt para forçar remember=true
        // em motoristas (sessão longa, ideal para app mobile em campo).
        $userToCheck = User::where('email', $request->input('email'))->first();
        $shouldRemember = $request->boolean('remember')
            || ($userToCheck && $userToCheck->type === 'motorista');

        if (! Auth::attempt($request->only('email', 'password'), $shouldRemember)) {
            throw ValidationException::withMessages([
                'email' => __('These credentials do not match our records.'),
            ]);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();

        // verifica se está ativo
        if (! $user->is_active) {
            Auth::logout();

            throw ValidationException::withMessages([
                'email' => 'Seu usuário está bloqueado. Procure o administrador.',
            ]);
        }

        // grava último acesso
        $user->update([
            'last_login_at' => now(),
        ]);

        // Motorista: vai SEMPRE para /mobile/veiculos (ignora intended)
        if ($user->type === 'motorista') {
            session()->forget('url.intended');
            return Inertia::location('/mobile/veiculos');
        }

        $url = session()->pull('url.intended', '/dashboard');
        return Inertia::location($url);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
