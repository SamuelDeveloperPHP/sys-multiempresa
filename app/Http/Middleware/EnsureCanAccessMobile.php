<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante que o usuário pode acessar o módulo Mobile (PWA offline-first).
 *
 * Quem pode entrar:
 *   - super_admin   : acesso total
 *   - admin         : acesso total
 *   - manager       : acesso (gestores de obra/frota)
 *   - motorista     : acesso (perfil específico do app)
 *
 * Quem NÃO pode (user comum sem permissão específica): redirecionado para
 * /dashboard com flash error.
 */
class EnsureCanAccessMobile
{
    private const ALLOWED_TYPES = ['super_admin', 'admin', 'manager', 'motorista'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        if (!in_array($user->type, self::ALLOWED_TYPES, true)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Você não tem permissão para acessar o módulo mobile.',
                ], 403);
            }
            return redirect('/dashboard')->with('message', 'Você não tem permissão para acessar o módulo mobile.');
        }

        return $next($request);
    }
}
