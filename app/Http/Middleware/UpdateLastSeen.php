<?php

// app/Http/Middleware/UpdateLastSeen.php
namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class UpdateLastSeen
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // `last_seen_at` só existe na tabela `users`. Outras entidades
        // autenticáveis (ex.: Funcionario via WebAuthn) não têm essa coluna.
        $user = $request->user();
        if ($user instanceof User) {
            $user->forceFill(['last_seen_at' => now()])->saveQuietly();
        }

        return $response;
    }
}
