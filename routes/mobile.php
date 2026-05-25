<?php

use App\Http\Controllers\Mobile\PagesController;
use App\Http\Controllers\Mobile\Api\MobileApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Mobile (PWA offline-first)
|--------------------------------------------------------------------------
|
| Pages: /mobile/*           — Inertia (apenas casco; dados via API JSON).
| API:   /api/mobile/*       — endpoints JSON consumidos pelos repositories
|                              do client (Dexie/IndexedDB).
|
| Ambos exigem auth — o login continua o tradicional (Breeze). A sessão
| Laravel é mantida via cookie (withCredentials no axios).
*/

// =============== Atalhos curtos (digitáveis no celular) ===============
Route::get('/m',           fn() => redirect('/mobile/veiculos'))->name('m.short');
Route::get('/mobile',      fn() => redirect('/mobile/veiculos'))->name('mobile.short');

// =============== PAGES (Inertia) ===============
Route::middleware(['auth', 'mobile.access'])->prefix('mobile')->name('mobile.')->group(function () {

    // Veículos
    Route::get('/veiculos',                   [PagesController::class, 'veiculosIndex'])->name('veiculos.index');
    Route::get('/veiculos/{id}',              [PagesController::class, 'veiculosShow'])->name('veiculos.show');

    // Abastecimentos (por veículo)
    Route::get('/veiculos/{id}/abastecimentos',           [PagesController::class, 'abastecimentosIndex'])->name('abastecimentos.index');
    Route::get('/veiculos/{id}/abastecimentos/criar',     [PagesController::class, 'abastecimentosCreate'])->name('abastecimentos.create');
    Route::get('/veiculos/{id}/abastecimentos/{abId}',    [PagesController::class, 'abastecimentosShow'])->name('abastecimentos.show');
    Route::get('/veiculos/{id}/abastecimentos/{abId}/editar', [PagesController::class, 'abastecimentosEdit'])->name('abastecimentos.edit');

    // Diário de Bordo
    Route::get('/veiculos/{id}/diario-bordo',             [PagesController::class, 'diarioIndex'])->name('diario.index');
    Route::get('/veiculos/{id}/diario-bordo/criar',       [PagesController::class, 'diarioCreate'])->name('diario.create');
    Route::get('/veiculos/{id}/diario-bordo/{dId}',       [PagesController::class, 'diarioShow'])->name('diario.show');
    Route::get('/veiculos/{id}/diario-bordo/{dId}/editar',[PagesController::class, 'diarioEdit'])->name('diario.edit');
    Route::get('/veiculos/{id}/diario-bordo/{dId}/close', [PagesController::class, 'diarioClose'])->name('diario.close');

    // Checklist
    Route::get('/veiculos/{id}/checklist',                 [PagesController::class, 'checklistIndex'])->name('checklist.index');
    Route::get('/veiculos/{id}/checklist/iniciar/{tplId}', [PagesController::class, 'checklistIniciar'])->name('checklist.iniciar');
    Route::get('/veiculos/{id}/checklist/servicos/{sId}',           [PagesController::class, 'checklistServicoShow'])->name('checklist.servico.show');
    Route::get('/veiculos/{id}/checklist/servicos/{sId}/editar',    [PagesController::class, 'checklistServicoEdit'])->name('checklist.servico.edit');

    // Locações (por veículo)
    Route::get('/veiculos/{id}/locacoes',                  [PagesController::class, 'locacoesIndex'])->name('locacoes.index');

    // ====== LISTAS GLOBAIS (atalhos do drawer/bottom nav) ======
    Route::get('/abastecimentos',  [PagesController::class, 'abastecimentosGlobalIndex'])->name('abastecimentos.global');
    Route::get('/diario-bordo',    [PagesController::class, 'diarioGlobalIndex'])->name('diario.global');
    Route::get('/checklists',      [PagesController::class, 'checklistsGlobalIndex'])->name('checklists.global');
    Route::get('/locacoes',        [PagesController::class, 'locacoesGlobalIndex'])->name('locacoes.global');
});

// =============== API JSON (consumida pelo Dexie) ===============
Route::middleware(['auth', 'mobile.access', 'throttle:120,1'])->prefix('api/mobile')->name('mobile.api.')->group(function () {

    // Health check
    Route::get('/ping', [MobileApiController::class, 'ping'])->name('ping');

    // Veículos
    Route::get('/veiculos',                                [MobileApiController::class, 'veiculosIndex'])->name('veiculos.index');
    Route::get('/veiculos/{id}',                           [MobileApiController::class, 'veiculosShow'])->name('veiculos.show');

    // Abastecimentos
    Route::get('/veiculos/{veiculoId}/abastecimentos',     [MobileApiController::class, 'abastecimentosByVeiculo']);
    Route::post('/abastecimentos',                         [MobileApiController::class, 'abastecimentosStore']);
    Route::put('/abastecimentos/{id}',                     [MobileApiController::class, 'abastecimentosUpdate']);
    Route::delete('/abastecimentos/{id}',                  [MobileApiController::class, 'abastecimentosDestroy']);

    // Diário de Bordo
    Route::get('/veiculos/{veiculoId}/diario-bordo',       [MobileApiController::class, 'diarioByVeiculo']);
    Route::post('/diario-bordo',                           [MobileApiController::class, 'diarioStore']);
    Route::put('/diario-bordo/{id}',                       [MobileApiController::class, 'diarioUpdate']);
    Route::delete('/diario-bordo/{id}',                    [MobileApiController::class, 'diarioDestroy']);

    // Checklists (templates)
    Route::get('/checklists',                              [MobileApiController::class, 'checklistsAll']);
    Route::get('/obras/{obraId}/checklists',               [MobileApiController::class, 'checklistsByObra']);

    // Checklist execuções (servicos)
    Route::get('/veiculos/{veiculoId}/checklist-servicos', [MobileApiController::class, 'checklistServicosByVeiculo']);
    Route::post('/checklist-servicos',                     [MobileApiController::class, 'checklistServicosStore']);
    Route::put('/checklist-servicos/{id}',                 [MobileApiController::class, 'checklistServicosUpdate']);
    Route::delete('/checklist-servicos/{id}',              [MobileApiController::class, 'checklistServicosDestroy']);

    // Locações
    Route::get('/veiculos/{veiculoId}/locacoes',           [MobileApiController::class, 'locacoesByVeiculo']);

    // ====== LISTAS GLOBAIS (cross-veículo) ======
    Route::get('/abastecimentos',     [MobileApiController::class, 'abastecimentosAll']);
    Route::get('/diario-bordo',       [MobileApiController::class, 'diarioAll']);
    Route::get('/checklist-servicos', [MobileApiController::class, 'checklistServicosAll']);
    Route::get('/locacoes',           [MobileApiController::class, 'locacoesAll']);
});
