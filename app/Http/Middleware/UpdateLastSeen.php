<?php

// app/Http/Middleware/UpdateLastSeen.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class UpdateLastSeen
{
    public function handle(Request $request, Closure $next)
    {
        // só pra debug
        Log::info('UpdateLastSeen middleware chamado', [
            'path'   => $request->path(),
            'userId' => optional($request->user())->id,
        ]);

        $response = $next($request);

        if ($user = $request->user()) {
            $user->forceFill([
                'last_seen_at' => now(),
            ])->saveQuietly();
        }

        return $response;
    }
}
