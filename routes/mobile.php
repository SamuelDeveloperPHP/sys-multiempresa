<?php

use App\Http\Controllers\Mobile\PagesController;
use App\Http\Controllers\Mobile\Api\MobileApiController;
use App\Http\Middleware\FleetModuleAccess;
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
Route::get('/evidencias-frota/{tipo}/{nome}/{execucao?}', \App\Http\Controllers\Mobile\EvidenciaController::class)
    ->middleware(['auth', 'company'])->whereIn('tipo', ['abastecimentos', 'diario_bordo', 'checklist_servicos'])
    ->where('nome', 'priv-[a-f0-9-]{36}\.(?:jpeg|png|webp)')->whereNumber('execucao')->name('frota.evidencia');

Route::middleware(['auth', 'mobile.access', 'company'])->prefix('mobile')->name('mobile.')->group(function () {

    // Dashboard
    Route::get('/dashboard', [PagesController::class, 'dashboardMobile'])->name('dashboard');

    // Perfil
    Route::get('/perfil',                  [PagesController::class, 'perfilIndex'])->name('perfil.index');
    Route::get('/perfil/alterar-senha',    [PagesController::class, 'perfilAlterarSenha'])->name('perfil.alterar-senha');

    // Veículos
    Route::get('/veiculos',                   [PagesController::class, 'veiculosIndex'])->name('veiculos.index')->middleware(FleetModuleAccess::class.':frota.veiculos,list');
    Route::get('/veiculos/{id}',              [PagesController::class, 'veiculosShow'])->name('veiculos.show')->middleware(FleetModuleAccess::class.':frota.veiculos,view');

    // Abastecimentos (por veículo)
    Route::get('/veiculos/{id}/abastecimentos',           [PagesController::class, 'abastecimentosIndex'])->name('abastecimentos.index')->middleware(FleetModuleAccess::class.':frota.abastecimentos,list');
    Route::get('/veiculos/{id}/abastecimentos/criar',     [PagesController::class, 'abastecimentosCreate'])->name('abastecimentos.create')->middleware(FleetModuleAccess::class.':frota.abastecimentos,create');
    Route::get('/veiculos/{id}/abastecimentos/{abId}',    [PagesController::class, 'abastecimentosShow'])->name('abastecimentos.show')->middleware(FleetModuleAccess::class.':frota.abastecimentos,view');
    Route::get('/veiculos/{id}/abastecimentos/{abId}/editar', [PagesController::class, 'abastecimentosEdit'])->name('abastecimentos.edit')->middleware(FleetModuleAccess::class.':frota.abastecimentos,edit');

    // Diário de Bordo
    Route::get('/veiculos/{id}/diario-bordo',             [PagesController::class, 'diarioIndex'])->name('diario.index')->middleware(FleetModuleAccess::class.':frota.diario,list');
    Route::get('/veiculos/{id}/diario-bordo/criar',       [PagesController::class, 'diarioCreate'])->name('diario.create')->middleware(FleetModuleAccess::class.':frota.diario,create');
    Route::get('/veiculos/{id}/diario-bordo/{dId}',       [PagesController::class, 'diarioShow'])->name('diario.show')->middleware(FleetModuleAccess::class.':frota.diario,view');
    Route::get('/veiculos/{id}/diario-bordo/{dId}/editar',[PagesController::class, 'diarioEdit'])->name('diario.edit')->middleware(FleetModuleAccess::class.':frota.diario,edit');
    Route::get('/veiculos/{id}/diario-bordo/{dId}/close', [PagesController::class, 'diarioClose'])->name('diario.close')->middleware(FleetModuleAccess::class.':frota.diario,edit');

    // Checklist
    Route::get('/veiculos/{id}/checklist',                 [PagesController::class, 'checklistIndex'])->name('checklist.index')->middleware(FleetModuleAccess::class.':frota.checklists,list');
    Route::get('/veiculos/{id}/checklist/iniciar/{tplId}', [PagesController::class, 'checklistIniciar'])->name('checklist.iniciar')->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,create');
    Route::get('/veiculos/{id}/checklist/servicos/{sId}',           [PagesController::class, 'checklistServicoShow'])->name('checklist.servico.show')->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,view');
    Route::get('/veiculos/{id}/checklist/servicos/{sId}/editar',    [PagesController::class, 'checklistServicoEdit'])->name('checklist.servico.edit')->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,edit');

    // Locações (por veículo)
    Route::get('/veiculos/{id}/locacoes',                  [PagesController::class, 'locacoesIndex'])->name('locacoes.index')->middleware(FleetModuleAccess::class.':frota.locacoes,list');

    // ====== LISTAS GLOBAIS (atalhos do drawer/bottom nav) ======
    Route::get('/abastecimentos',  [PagesController::class, 'abastecimentosGlobalIndex'])->name('abastecimentos.global')->middleware(FleetModuleAccess::class.':frota.abastecimentos,list');
    Route::get('/diario-bordo',    [PagesController::class, 'diarioGlobalIndex'])->name('diario.global')->middleware(FleetModuleAccess::class.':frota.diario,list');
    Route::get('/checklists',      [PagesController::class, 'checklistsGlobalIndex'])->name('checklists.global')->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,list');
    Route::get('/locacoes',        [PagesController::class, 'locacoesGlobalIndex'])->name('locacoes.global')->middleware(FleetModuleAccess::class.':frota.locacoes,list');
});

// =============== API JSON (consumida pelo Dexie) ===============
Route::middleware(['auth', 'mobile.access', 'company', 'throttle:120,1'])->prefix('api/mobile')->name('mobile.api.')->group(function () {

    Route::get('/permissions', fn () => response()->json(request()->user()->grantedModules(\App\Helpers\CompanyContext::id()))->header('Cache-Control', 'private, no-store'));

    // Health check
    Route::get('/ping', [MobileApiController::class, 'ping'])->name('ping');

    // Perfil do usuário
    Route::get('/users/me',                  [MobileApiController::class, 'me'])->name('users.me');
    Route::put('/users/change-password',     [MobileApiController::class, 'changePassword'])->name('users.change-password');

    // Veículos
    Route::get('/veiculos',                                [MobileApiController::class, 'veiculosIndex'])->name('veiculos.index')->middleware(FleetModuleAccess::class.':frota.veiculos,list');
    Route::get('/veiculos/{id}',                           [MobileApiController::class, 'veiculosShow'])->name('veiculos.show')->middleware(FleetModuleAccess::class.':frota.veiculos,view');

    // Abastecimentos
    Route::get('/veiculos/{veiculoId}/abastecimentos',     [MobileApiController::class, 'abastecimentosByVeiculo'])->middleware(FleetModuleAccess::class.':frota.abastecimentos,list');
    Route::post('/abastecimentos',                         [MobileApiController::class, 'abastecimentosStore'])->middleware(FleetModuleAccess::class.':frota.abastecimentos,create');
    Route::put('/abastecimentos/{id}',                     [MobileApiController::class, 'abastecimentosUpdate'])->middleware(FleetModuleAccess::class.':frota.abastecimentos,edit');
    Route::delete('/abastecimentos/{id}',                  [MobileApiController::class, 'abastecimentosDestroy'])->middleware(FleetModuleAccess::class.':frota.abastecimentos,delete');

    // Diário de Bordo
    Route::get('/veiculos/{veiculoId}/diario-bordo',       [MobileApiController::class, 'diarioByVeiculo'])->middleware(FleetModuleAccess::class.':frota.diario,list');
    Route::post('/diario-bordo',                           [MobileApiController::class, 'diarioStore'])->middleware(FleetModuleAccess::class.':frota.diario,create');
    Route::put('/diario-bordo/{id}',                       [MobileApiController::class, 'diarioUpdate'])->middleware(FleetModuleAccess::class.':frota.diario,edit');
    Route::delete('/diario-bordo/{id}',                    [MobileApiController::class, 'diarioDestroy'])->middleware(FleetModuleAccess::class.':frota.diario,delete');

    // Checklists (templates)
    Route::get('/checklists',                              [MobileApiController::class, 'checklistsAll'])->middleware(FleetModuleAccess::class.':frota.checklists,list');
    Route::get('/veiculos/{veiculoId}/checklists',         [MobileApiController::class, 'checklistsByVeiculo'])->middleware(FleetModuleAccess::class.':frota.checklists,list');
    // DEPRECATED: mantém para clientes antigos não quebrarem (retorna lista vazia)
    Route::get('/obras/{obraId}/checklists',               [MobileApiController::class, 'checklistsByObra'])->middleware(FleetModuleAccess::class.':frota.checklists,list');

    // Checklist execuções (servicos)
    Route::get('/veiculos/{veiculoId}/checklist-servicos', [MobileApiController::class, 'checklistServicosByVeiculo'])->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,list');
    Route::post('/checklist-servicos',                     [MobileApiController::class, 'checklistServicosStore'])->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,create');
    Route::put('/checklist-servicos/{id}',                 [MobileApiController::class, 'checklistServicosUpdate'])->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,edit');
    Route::delete('/checklist-servicos/{id}',              [MobileApiController::class, 'checklistServicosDestroy'])->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,delete');

    // Locações
    Route::get('/veiculos/{veiculoId}/locacoes',           [MobileApiController::class, 'locacoesByVeiculo'])->middleware(FleetModuleAccess::class.':frota.locacoes,list');

    // ====== LISTAS GLOBAIS (cross-veículo) ======
    Route::get('/abastecimentos',     [MobileApiController::class, 'abastecimentosAll'])->middleware(FleetModuleAccess::class.':frota.abastecimentos,list');
    Route::get('/diario-bordo',       [MobileApiController::class, 'diarioAll'])->middleware(FleetModuleAccess::class.':frota.diario,list');
    Route::get('/checklist-servicos', [MobileApiController::class, 'checklistServicosAll'])->middleware(FleetModuleAccess::class.':frota.checklist-execucoes,list');
    Route::get('/locacoes',           [MobileApiController::class, 'locacoesAll'])->middleware(FleetModuleAccess::class.':frota.locacoes,list');
});
