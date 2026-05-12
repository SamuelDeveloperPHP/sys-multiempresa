<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Portal\AuthController;
use Inertia\Inertia;

// Rotas de Guest (Login)
Route::middleware('guest:client')->group(function () {
    Route::get('login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('login', [AuthController::class, 'login']);
});

// Rotas Autenticadas do Cliente
Route::middleware([\App\Http\Middleware\EnsureClientAuthenticated::class])->group(function () {
    
    // Rota de desafio do 2FA
    Route::get('2fa/challenge', [AuthController::class, 'show2faChallenge'])->name('2fa.challenge');
    Route::post('2fa/challenge', [AuthController::class, 'verify2fa']);

    // Área restrita 2FA-Protected
    Route::middleware([\App\Http\Middleware\Ensure2faVerified::class])->group(function () {
        Route::get('dashboard', function () {
            // Dashboard usando o Clean White Theme Rise
            return Inertia::render('Portal/Dashboard');
        })->name('dashboard');

        // Logout
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');
    });
});
