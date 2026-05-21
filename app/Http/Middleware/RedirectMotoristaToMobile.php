<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Quando um usuário do tipo "motorista" tenta acessar rotas administrativas
 * (/, /dashboard, /admin/*, /companies/*), redireciona automaticamente
 * para /mobile/veiculos.
 *
 * Motoristas não devem ver a interface desktop — só o app mobile.
 */
class RedirectMotoristaToMobile
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->type === 'motorista') {
            $path = $request->path();
            $isMobile = str_starts_with($path, 'mobile')
                || str_starts_with($path, 'api/mobile')
                || str_starts_with($path, 'logout')
                || str_starts_with($path, 'profile')
                || str_starts_with($path, 'sw.js')
                || str_starts_with($path, 'manifest.webmanifest');

            if (!$isMobile) {
                // Se for uma chamada AJAX/JSON, devolve 403 (não redireciona)
                if ($request->expectsJson()) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Motoristas usam apenas o app mobile.',
                        'redirect' => '/mobile/veiculos',
                    ], 403);
                }
                return redirect('/mobile/veiculos');
            }
        }

        return $next($request);
    }
}
