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
    Route::get('security/2fa', [AuthController::class, 'show2faSettings'])->name('2fa.settings');
    Route::post('security/2fa/generate', [AuthController::class, 'generate2fa'])->middleware('throttle:5,1')->name('2fa.generate');
    Route::post('security/2fa/enable', [AuthController::class, 'enable2fa'])->middleware('throttle:5,1')->name('2fa.enable');
    Route::post('security/2fa/disable', [AuthController::class, 'disable2fa'])->middleware('throttle:5,1')->name('2fa.disable');
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    // Área restrita 2FA-Protected
    Route::middleware([\App\Http\Middleware\Ensure2faVerified::class])->group(function () {
        Route::get('dashboard', function () {
            // Dashboard usando o Clean White Theme Rise
            return Inertia::render('Portal/Dashboard');
        })->name('dashboard');

    });
});
