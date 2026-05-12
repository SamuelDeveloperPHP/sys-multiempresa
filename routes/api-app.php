<?php

use App\Http\Controllers\Api\AppAuthController;
use App\Http\Controllers\Api\SyncController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API do app mobile Engeativos (Capacitor)
|--------------------------------------------------------------------------
| Tokens Sanctum bearer (escopo 'mobile'). NAO usa cookie HTTP-only.
| Para registrar este arquivo no bootstrap, ver bootstrap/app.php:
|     ->withRouting(
|         api: __DIR__.'/../routes/api-app.php',
|         apiPrefix: 'api',
|         ...
|     )
| ou registre via RouteServiceProvider/AppServiceProvider conforme padrao do projeto.
*/

// ------------------------------------------------------------------
// Endpoints PUBLICOS (sem auth)
// ------------------------------------------------------------------
Route::post('/app_login',  [AppAuthController::class, 'login']);

// ------------------------------------------------------------------
// Endpoints AUTENTICADOS (Sanctum token bearer)
// ------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/app_logout', [AppAuthController::class, 'logout']);

    Route::get('/modulos-permitidos', [AppAuthController::class, 'modulosPermitidos']);

    // Sync
    Route::get('/sync/schema',   [SyncController::class, 'schema']);
    Route::post('/upload/{tabela}', [SyncController::class, 'upload']);
    Route::get('/download/{tabela}', [SyncController::class, 'download']);

    Route::post('/sincronizacoes', [SyncController::class, 'registrarSync']);
    Route::post('/sincronizacoes/log-error', [SyncController::class, 'registrarLogErro']);
});
