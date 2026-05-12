<?php

use App\Http\Middleware\EnsureCompanySelected;
use App\Http\Middleware\EnsureObraSelected;
use App\Http\Middleware\EnsureJarvisAccess;
use App\Http\Middleware\ModuleAccess;
use App\Http\Middleware\RequestActivityLogger;
use App\Http\Middleware\UpdateLastSeen;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// middlewares de rota
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\View\Middleware\ShareErrorsFromSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Illuminate\Support\Facades\Route::middleware(['web', \App\Http\Middleware\HandleInertiaRequests::class])
                ->prefix('portal')
                ->name('portal.')
                ->group(base_path('routes/portal.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // 🔹 define o grupo WEB completo
        $middleware->web(append: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class, 
            VerifyCsrfToken::class,
            SubstituteBindings::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        // 🔹 aliases de middlewares de rota
        $middleware->alias([
            'auth'          => Authenticate::class,
            'verified'      => EnsureEmailIsVerified::class,
            'company'       => EnsureCompanySelected::class,
            'obra'          => EnsureObraSelected::class,
            'jarvis.access' => EnsureJarvisAccess::class,
            'module.access' => ModuleAccess::class,
            'lastseen'      => UpdateLastSeen::class,
            'activity'      => RequestActivityLogger::class
        ]);

        // redirects padrão
        $middleware->redirectTo(
            guests: '/login',
            users: '/dashboard',
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
