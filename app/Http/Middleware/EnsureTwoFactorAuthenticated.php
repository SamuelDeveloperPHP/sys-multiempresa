<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\TwoFactorAuthentication;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureTwoFactorAuthenticated
{
    private const ALLOWED_ROUTES = [
        'logout',
        'two-factor.challenge',
        'two-factor.verify',
        'profile.edit',
        'profile.2fa.generate',
        'profile.2fa.enable',
        'profile.2fa.disable',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('web');

        if (! $user instanceof User || in_array($request->route()?->getName(), self::ALLOWED_ROUTES, true)) {
            return $next($request);
        }

        if (app()->environment('testing') && (bool) $request->session()->get(TwoFactorAuthentication::SESSION_TEST_COMPLETE_KEY)) {
            return $next($request);
        }

        $enabled = TwoFactorAuthentication::enabled($user);

        if (TwoFactorAuthentication::required($user) && ! $enabled) {
            return $this->redirect($request, route('profile.edit'), 'Configure a autenticação em dois fatores para continuar.');
        }

        if ($enabled && ! TwoFactorAuthentication::verified($request, $user)) {
            if ($request->isMethod('GET')) {
                $request->session()->put('auth.two_factor_intended', $request->fullUrl());
            }

            return $this->redirect($request, route('two-factor.challenge'), 'Confirme o código de segurança para continuar.');
        }

        return $next($request);
    }

    private function redirect(Request $request, string $url, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'redirect' => $url,
            ], 423);
        }

        return redirect()->to($url)->with('message', $message);
    }
}
