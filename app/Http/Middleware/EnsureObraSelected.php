<?php

namespace App\Http\Middleware;

use App\Helpers\ObraContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante que uma obra esteja selecionada na sessão antes de acessar
 * rotas que dependem de contexto de obra.
 *
 * Use o alias 'obra' nas rotas:
 *   Route::middleware(['auth', 'company', 'obra'])->group(...)
 */
class EnsureObraSelected
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! ObraContext::hasCurrent()) {
            // Limpa obra inválida caso o ID na sessão não exista mais
            ObraContext::clear();

            return redirect()->route('obras.select')
                ->with('info', 'Selecione uma obra para continuar.');
        }

        return $next($request);
    }
}
