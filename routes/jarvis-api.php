<?php

use App\Http\Controllers\Api\Jarvis\BootstrapController;
use App\Http\Controllers\Api\Jarvis\ConversationController;
use App\Http\Controllers\Api\Jarvis\MessageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'company', 'jarvis.access'])
    ->prefix('api/jarvis')
    ->name('jarvis.api.')
    ->group(function () {
        Route::get('bootstrap', BootstrapController::class)->name('bootstrap');
        Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
        Route::post('conversations', [ConversationController::class, 'store'])->name('conversations.store');
        Route::get('conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');
        Route::post('conversations/{conversation}/messages', [MessageController::class, 'store'])->name('conversations.messages.store');
    });
