<?php

// app/Http/Kernel.php
namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;
use Illuminate\Auth\Middleware\Authenticate;

class Kernel extends HttpKernel
{
    protected $middleware = [
        // Se você tiver outros globais, deixa aqui.
    ];

    protected $middlewareGroups = [
        'web' => [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,

            // 👉 nosso middleware de "visto por último"
            'lastseen'    => \App\Http\Middleware\UpdateLastSeen::class,
        ],

        'api' => [
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    protected $routeMiddleware = [
        'auth'        => Authenticate::class,
        'lastseen'    => \App\Http\Middleware\UpdateLastSeen::class,
        // outros que você tiver...
    ];
}
