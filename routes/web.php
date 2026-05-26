<?php

use App\Http\Controllers\Admin\AuditLogController;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ObraSelectionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\ModuleController;
use App\Http\Controllers\Admin\ObraController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\Post\PostImageController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\TagController as AdminTagController;

/*
|--------------------------------------------------------------------------
| Página inicial
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return \Inertia\Inertia::render('Portal/Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

/*
|--------------------------------------------------------------------------
| Service Worker (PWA) — servido na raiz para ter escopo global "/"
|--------------------------------------------------------------------------
| Em PROD: serve o sw.js gerado pelo Vite (com reescrita de paths).
| Em DEV:  serve um "kill-switch SW" que se auto-desregistra, limpa caches
|          e força reload — necessário porque um SW antigo cacheado pode
|          continuar interceptando o HTML cacheado (com [::1]:5173) e
|          impedindo que a versão nova chegue ao browser.
*/
Route::get('/sw.js', function () {
    // -----------------------------------------------------------------------
    // DEV: Kill-Switch SW (auto-destrutivo)
    // -----------------------------------------------------------------------
    // O browser CHECA atualização do /sw.js a cada navegação. Quando ele
    // pegar esse kill-switch, vai:
    //   1) install: skipWaiting() → ativa imediatamente
    //   2) activate: limpa CacheStorage + desregistra a si mesmo +
    //                navega cada client para client.url (reload fresh)
    //   3) fetch: NÃO intercepta — deixa tudo passar direto pro servidor
    // Resultado: na próxima navegação o HTML vem fresh do Laravel, sem SW.
    if (!app()->environment('production')) {
        $kill = <<<'JS'
// === SGA Kill-Switch Service Worker (DEV ONLY) ===
// Auto-desregistra, limpa caches e recarrega clients controlados.
// Servido pela rota Laravel /sw.js quando APP_ENV != production.

self.addEventListener('install', (event) => {
    // Pula o estado "waiting" — ativa assim que instala
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            // 1) Toma controle imediato dos clients
            await self.clients.claim();

            // 2) Limpa TODOS os caches do CacheStorage (workbox, runtime, etc)
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(n => caches.delete(n)));

            // 3) Desregistra a si mesmo
            await self.registration.unregister();

            // 4) Força reload de todos os clients (HTML virá fresh do server)
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of clients) {
                try {
                    // navigate() força reload sem manter histórico bagunçado
                    await client.navigate(client.url);
                } catch (e) {
                    // Fallback: postMessage (caso navigate falhe)
                    try { client.postMessage({ type: 'SW_KILLED_RELOAD' }); } catch (_) {}
                }
            }
        } catch (e) {
            // Silencia — não há nada para fazer em caso de erro aqui
        }
    })());
});

// NÃO interceptamos fetch — todas as requisições vão direto pro servidor.
// Sem listener de fetch, o SW não controla nenhuma resposta.
JS;
        return response($kill, 200, [
            'Content-Type' => 'application/javascript',
            'Service-Worker-Allowed' => '/',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    // -----------------------------------------------------------------------
    // PROD: sw.js do Vite com reescrita de paths
    // -----------------------------------------------------------------------
    $file = public_path('build/sw.js');
    if (!file_exists($file)) {
        return response('// service worker ainda não foi gerado (rode `npm run build`)', 200, [
            'Content-Type' => 'application/javascript',
            'Service-Worker-Allowed' => '/',
        ]);
    }

    // O sw.js gerado pelo Vite usa paths RELATIVOS (./workbox-XXX, assets/Y.js).
    // Como servimos a partir da raiz "/sw.js", esses paths resolvem para a
    // raiz pública (404). Reescrevemos cada um para apontar para /build/.
    $content = file_get_contents($file);
    $content = preg_replace_callback(
        '#(["\'])(?:\./)?(workbox-[a-f0-9]+(?:\.js)?)\1#',
        fn($m) => $m[1] . '/build/' . $m[2] . $m[1],
        $content
    );
    $content = preg_replace(
        '#(["\'])assets/#',
        '$1/build/assets/',
        $content
    );
    $content = preg_replace(
        '#(["\'])manifest\.webmanifest\1#',
        '$1/manifest.webmanifest$1',
        $content
    );
    // NavigationRoute do Workbox agora aponta para "/offline.html" (configurado
    // via navigateFallback no vite.config.js). Esse arquivo é precacheado
    // automaticamente pelo globPatterns *.html, então a NavigationRoute funciona
    // corretamente. NÃO removemos mais essa linha — ela é essencial para que
    // navegações offline para URLs não-cacheadas tenham um fallback amigável.

    return response($content, 200, [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/',
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
})->name('sw.js');

/*
|--------------------------------------------------------------------------
| Dev-only: página de limpeza manual de SW + caches
|--------------------------------------------------------------------------
| Backup caso o kill-switch /sw.js não pegue (ex: usuário em offline ou
| browser que não está checando update). Acesse http://127.0.0.1:8000/_dev/reset-sw
| que executa unregister + caches.delete + reload com feedback visual.
*/
Route::get('/_dev/reset-sw', function () {
    abort_if(app()->environment('production'), 404);
    return response(<<<'HTML'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Reset SW — SGA Dev</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #1f2937; background: #f9fafb; }
  h1 { color: #557bbb; }
  pre { background: #111827; color: #e5e7eb; padding: 16px; border-radius: 8px; font-size: 13px; overflow-x: auto; }
  .ok { color: #10b981; font-weight: bold; }
  .err { color: #ef4444; }
  button { background: #557bbb; color: white; border: 0; padding: 10px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-right: 8px; }
  button:hover { background: #4263a3; }
</style>
</head>
<body>
<h1>SGA · Reset Service Worker (DEV)</h1>
<p>Limpa Service Workers, CacheStorage e força nova navegação fresh do servidor.</p>
<pre id="log">[aguardando…]</pre>
<button onclick="goHome()">Ir para /</button>
<button onclick="goMobile()">Ir para /mobile/veiculos</button>
<script>
const log = document.getElementById('log');
function put(msg, cls) {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = msg;
  log.appendChild(line);
}
log.textContent = '';

(async () => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      put('SWs encontrados: ' + regs.length);
      for (const r of regs) {
        const ok = await r.unregister();
        put(' • unregister ' + r.scope + ' → ' + (ok ? 'OK' : 'FAIL'), ok ? 'ok' : 'err');
      }
    } else {
      put('serviceWorker API indisponível neste browser', 'err');
    }
    if (window.caches) {
      const keys = await caches.keys();
      put('Caches encontrados: ' + keys.length);
      for (const k of keys) {
        const ok = await caches.delete(k);
        put(' • delete cache ' + k + ' → ' + (ok ? 'OK' : 'FAIL'), ok ? 'ok' : 'err');
      }
    }
    put('');
    put('✓ LIMPEZA CONCLUÍDA. Feche esta aba e abra uma NOVA aba em http://127.0.0.1:8000', 'ok');
    put('  (não recarregue esta aba — abra uma nova para garantir contexto fresh)');
  } catch (e) {
    put('ERRO: ' + e.message, 'err');
  }
})();

function goHome() { window.location.href = '/'; }
function goMobile() { window.location.href = '/mobile/veiculos'; }
</script>
</body>
</html>
HTML, 200, ['Content-Type' => 'text/html; charset=utf-8']);
})->name('dev.reset-sw');

/*
|--------------------------------------------------------------------------
| Health-check público (sem auth)
|--------------------------------------------------------------------------
| Endpoint super leve usado pelo client (useOnlineStatus) para detectar
| conexão real com o servidor. Diferente de navigator.onLine, que só
| responde a "modo avião", esse ping detecta também:
|   - WiFi conectado mas sem internet
|   - WiFi caindo / instabilidade
|   - Captive portals
|   - DNS quebrado
| Retorna 204 No Content (sem corpo, sem cookies) para minimizar tráfego.
*/
Route::get('/health/ping', function () {
    return response()->noContent()->header('Cache-Control', 'no-store');
})->name('health.ping');

Route::get('/manifest.webmanifest', function () {
    $file = public_path('build/manifest.webmanifest');
    if (!file_exists($file)) {
        // Fallback inline se o build ainda não rodou
        return response()->json([
            'name' => 'SGA Engeativos',
            'short_name' => 'SGA',
            'theme_color' => '#557bbb',
            'background_color' => '#ffffff',
            'display' => 'standalone',
            'start_url' => '/mobile/veiculos',
            'icons' => [
                ['src' => '/icons/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any maskable'],
                ['src' => '/icons/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
            ],
        ])->header('Content-Type', 'application/manifest+json');
    }
    return response(file_get_contents($file), 200, [
        'Content-Type' => 'application/manifest+json',
    ]);
})->name('manifest');

/*
|--------------------------------------------------------------------------
| Rotas de autenticação (Breeze)
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';


/*
|--------------------------------------------------------------------------
| Rotas publicas do Blog (Breeze)
|--------------------------------------------------------------------------
*/
require __DIR__ . '/blog.php';
require __DIR__ . '/jarvis-api.php';
require __DIR__ . '/mobile.php';

/*
|--------------------------------------------------------------------------
| Página pública do funcionário (QR Code do crachá)
|--------------------------------------------------------------------------
*/
Route::get('/detalhes/funcionario/{id}', [\App\Http\Controllers\PublicFuncionarioController::class, 'show'])
    ->whereNumber('id')
    ->name('public.funcionario.show');


/*
|--------------------------------------------------------------------------
| Perfil do usuário (apenas logado)
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {
    Route::get('/profile',  [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Security and Extended Profile Routes
    Route::post('/profile/photo', [ProfileController::class, 'updatePhoto'])->name('profile.photo.update');
    Route::post('/profile/location', [ProfileController::class, 'updateLocation'])->name('profile.location.update');
    
    // 2FA Routes (if we use ProfileController directly)
    Route::post('/profile/2fa/generate', [ProfileController::class, 'generate2faSecret'])->name('profile.2fa.generate');
    Route::post('/profile/2fa/enable', [ProfileController::class, 'enable2fa'])->name('profile.2fa.enable');
    Route::post('/profile/2fa/disable', [ProfileController::class, 'disable2fa'])->name('profile.2fa.disable');
});

/*
|--------------------------------------------------------------------------
| Fluxo de empresas ANTES de escolher empresa
| (sem middleware "company")
|--------------------------------------------------------------------------
|
| Aqui o usuário está logado, mas ainda pode não ter empresa ativa.
| Use nomes de rota diferentes de "companies.index" para não conflitar
| com as rotas administrativas.
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {

    // Tela para escolher a empresa atual
    Route::get('/companies/select', [CompanyController::class, 'select'])
        ->name('companies.select');

    // Define a empresa atual na sessão
    Route::post('/companies/set', [CompanyController::class, 'set'])
        ->name('companies.set');

    // Se quiser permitir criar empresa fora do admin
    Route::get('/companies/create', [CompanyController::class, 'create'])
        ->name('companies.setup.create');

    Route::post('/companies', [CompanyController::class, 'store'])
        ->name('companies.setup.store');

    // Lista simples de empresas para o assistente de seleção
    // (nome diferente para não bater com "companies.index" do admin)
    Route::get('/companies', [CompanyController::class, 'index'])
        ->name('companies.list');

    /*
    |------------------------------------------------------------------
    | Seleção de Obra (antes de entrar no contexto de obra)
    |------------------------------------------------------------------
    */
    Route::get('/obras/select',  [ObraSelectionController::class, 'select'])->name('obras.select');
    Route::post('/obras/set',    [ObraSelectionController::class, 'set'])->name('obras.set');
    Route::post('/obras/switch', [ObraSelectionController::class, 'switch'])->name('obras.switch');
});

/*
|--------------------------------------------------------------------------
| Rotas que exigem usuário logado + empresa selecionada
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'company', 'lastseen'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Dashboard principal
    |--------------------------------------------------------------------------
    */

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::view('/jarvis', 'jarvis')
        ->middleware('jarvis.access')
        ->name('jarvis.index');

    /*
    |--------------------------------------------------------------------------
    | Área administrativa /admin protegida por module.access
    |--------------------------------------------------------------------------
    |
    | Prefixo de URL: /admin/...
    | Nomes de rota batendo com a tabela "modules".
    |--------------------------------------------------------------------------
    */

    Route::prefix('admin')
        ->middleware('module.access')
        ->group(function () {

            // Biometria do próprio usuário (gestão de credenciais WebAuthn)
            // FASE 7.C — múltiplas credenciais para validar saída do estoque
            Route::get('perfil/biometria',
                [\App\Http\Controllers\Admin\BiometriaController::class, 'index'])
                ->name('admin.perfil.biometria.index');
            Route::delete('perfil/biometria/{credentialId}',
                [\App\Http\Controllers\Admin\BiometriaController::class, 'destroy'])
                ->name('admin.perfil.biometria.destroy');

            /*
            |------------------------------------------------------------------
            | Usuários - listagens especiais (ativos / inativos) + permissões
            |------------------------------------------------------------------
            |
            | Na tabela modules você tinha:
            |  users.index, users.active, users.inactive,
            |  admin.users.permissions.index
            |------------------------------------------------------------------
            */

            // /admin/users/active -> users.active
            Route::get('users/active', [AdminUserController::class, 'active'])
                ->name('users.active');

            // /admin/users/inactive -> users.inactive
            Route::get('users/inactive', [AdminUserController::class, 'inactive'])
                ->name('users.inactive');

            // /admin/users/permissions -> admin.users.permissions.index
            Route::get('users/permissions', [AdminUserController::class, 'permissionsIndex'])
                ->name('admin.users.permissions.index');

            /*
            |------------------------------------------------------------------
            | Backups
            |------------------------------------------------------------------
            | /admin/backups -> admin.backups.index
            */

            Route::get('backups', function () {
                return 'Página de backups (ajustar controller depois)';
            })->name('admin.backups.index');

            Route::get('configuracao/auditoria', [AuditLogController::class, 'index'])
                ->name('admin.audit.index');


            /*
            |------------------------------------------------------------------
            | Empresas (admin)
            |------------------------------------------------------------------
            | Resource em /admin/companies -> companies.*
            | (companies.index casa com módulo "Empresas")
            */

            Route::resource('companies', CompanyController::class);

            /*
            |------------------------------------------------------------------
            | Obras (admin)
            |------------------------------------------------------------------
            | URLs:      /admin/obras/...
            | RouteName: admin.obras.*
            |------------------------------------------------------------------
            */

            Route::get('obras',                              [ObraController::class, 'index'])->name('admin.obras.index');
            Route::get('obras/create',                       [ObraController::class, 'create'])->name('admin.obras.create');
            Route::post('obras',                             [ObraController::class, 'store'])->name('admin.obras.store');
            Route::get('obras/{obra}',                       [ObraController::class, 'show'])->name('admin.obras.show');
            Route::get('obras/{obra}/edit',                  [ObraController::class, 'edit'])->name('admin.obras.edit');
            Route::put('obras/{obra}',                       [ObraController::class, 'update'])->name('admin.obras.update');
            Route::delete('obras/{obra}',                    [ObraController::class, 'destroy'])->name('admin.obras.destroy');
            // Gestão de usuários por obra
            Route::get('obras/{obra}/usuarios',              [ObraController::class, 'users'])->name('admin.obras.users');
            Route::post('obras/{obra}/usuarios',             [ObraController::class, 'attachUser'])->name('admin.obras.users.attach');
            Route::delete('obras/{obra}/usuarios/{user}',    [ObraController::class, 'detachUser'])->name('admin.obras.users.detach');


            /*
            |------------------------------------------------------------------
            | Módulos
            |------------------------------------------------------------------
            | URLs:      /admin/configuracao/modulo/...
            | RouteName: admin.modules.*
            | (é isso que está na tabela modules)
            |------------------------------------------------------------------
            */

            Route::get('configuracao/modulo',                    [ModuleController::class, 'index'])->name('admin.modules.index');
            Route::get('configuracao/modulo/create',             [ModuleController::class, 'create'])->name('admin.modules.create');
            Route::get('configuracao/modulo/show/{module}',      [ModuleController::class, 'show'])->name('admin.modules.show');
            Route::get('configuracao/modulo/edit/{module}',      [ModuleController::class, 'edit'])->name('admin.modules.edit');
            Route::post('configuracao/modulo/store',             [ModuleController::class, 'store'])->name('admin.modules.store');
            Route::put('configuracao/modulo/update/{module}',    [ModuleController::class, 'update'])->name('admin.modules.update');
            Route::delete('configuracao/modulo/destroy/{module}', [ModuleController::class, 'destroy'])->name('admin.modules.destroy');


            /*
            |------------------------------------------------------------------
            | Usuários (admin) - CRUD principal
            |------------------------------------------------------------------
            | URLs:      /admin/configuracao/users/...
            | RouteName: users.*   (pra casar com modules: "users.index")
            | Se você preferir realmente "admin.users.*", é só atualizar
            | a coluna route_name da tabela modules pra bater com isso.
            |------------------------------------------------------------------
            */

            Route::get('configuracao/users',                 [AdminUserController::class, 'index'])->name('admin.users.index');
            Route::get('configuracao/users/create',          [AdminUserController::class, 'create'])->name('admin.users.create');
            Route::get('configuracao/users/show/{user}',     [AdminUserController::class, 'show'])->name('admin.users.show');
            Route::get('configuracao/users/edit/{user}',     [AdminUserController::class, 'edit'])->name('admin.users.edit');

            Route::post('configuracao/users/store',          [AdminUserController::class, 'store'])->name('admin.users.store');
            Route::put('configuracao/users/update/{user}',   [AdminUserController::class, 'update'])->name('admin.users.update');
            Route::delete('configuracao/users/destroy/{user}', [AdminUserController::class, 'destroy'])->name('admin.users.destroy');

            // Ativar / bloquear usuário
            Route::post('configuracao/users/{user}/toggle-status', [AdminUserController::class, 'toggleStatus'])
                ->name('users.toggle-status');

            /*
            |------------------------------------------------------------------
            | Funcionários (admin) - Cadastros > Departamento Pessoal
            |------------------------------------------------------------------
            */
            Route::get('cadastros/funcionarios',                 [\App\Http\Controllers\Admin\FuncionarioController::class, 'index'])->name('admin.funcionarios.index');
            Route::get('cadastros/funcionarios/revisao-onedrive', [\App\Http\Controllers\Admin\FuncionarioController::class, 'revisaoOnedrive'])->name('admin.funcionarios.revisao-onedrive');
            Route::get('cadastros/funcionarios/create',          [\App\Http\Controllers\Admin\FuncionarioController::class, 'create'])->name('admin.funcionarios.create');
            Route::post('cadastros/funcionarios/store',          [\App\Http\Controllers\Admin\FuncionarioController::class, 'store'])->name('admin.funcionarios.store');
            Route::get('cadastros/funcionarios/show/{funcionario}', [\App\Http\Controllers\Admin\FuncionarioController::class, 'show'])->name('admin.funcionarios.show');
            Route::get('cadastros/funcionarios/edit/{funcionario}', [\App\Http\Controllers\Admin\FuncionarioController::class, 'edit'])->name('admin.funcionarios.edit');
            Route::put('cadastros/funcionarios/update/{funcionario}', [\App\Http\Controllers\Admin\FuncionarioController::class, 'update'])->name('admin.funcionarios.update');
            Route::delete('cadastros/funcionarios/destroy/{funcionario}', [\App\Http\Controllers\Admin\FuncionarioController::class, 'destroy'])->name('admin.funcionarios.destroy');

            // Funcionários Anexos (Arquivos)
            Route::post('funcionarios/anexos', [\App\Http\Controllers\Admin\FuncionarioController::class, 'adicionarAnexos'])->name('admin.funcionarios.adicionar_anexos');
            Route::post('funcionarios/{funcionario}/foto', [\App\Http\Controllers\Admin\FuncionarioController::class, 'salvarFotoPerfil'])->name('admin.funcionarios.salvar_foto');
            Route::get('funcionarios/{funcionario}/anexos', [\App\Http\Controllers\Admin\FuncionarioController::class, 'anexos'])->name('admin.funcionarios.anexos');
            Route::post('funcionarios/documentos/aprovar', [\App\Http\Controllers\Admin\FuncionarioController::class, 'aprovarDocumentos'])->name('admin.funcionarios.aprovar_documentos');
            Route::delete('funcionarios/documentos/{id}', [\App\Http\Controllers\Admin\FuncionarioController::class, 'excluirDocumento'])->name('admin.funcionarios.excluir_documento');

            // (removido) Route::resource('funcionarios', ...) — gerava nomes duplicados
            // com as rotas individuais "cadastros/funcionarios/*" acima. CRUD ja coberto.

            // Fornecedores (cadastro compartilhado entre módulos)
            Route::resource('fornecedores', \App\Http\Controllers\Admin\FornecedorController::class, ['as' => 'admin'])
                ->only(['index', 'store', 'update', 'destroy']);

            /*
            |------------------------------------------------------------------
            | Frota (admin)
            |------------------------------------------------------------------
            | URLs base:  /admin/frota/...
            | RouteNames: admin.frota.*
            |
            | Controllers consolidados em App\Http\Controllers\Admin\Frota.
            | Substitui o antigo Admin\VeiculoController (que foi removido).
            |------------------------------------------------------------------
            */
            Route::prefix('frota')->name('admin.frota.')->group(function () {
                // Veiculos — endpoints extra antes do resource (subcategorias AJAX, galeria de imagens)
                Route::get('veiculos/subcategorias/{categoria}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'pesquisarSubcategoria'])
                    ->name('veiculos.subcategorias');
                Route::post('veiculos/{veiculo}/imagens', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeImage'])
                    ->name('veiculos.imagens.store');
                Route::delete('veiculos/imagens/{imagem}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'deleteImage'])
                    ->name('veiculos.imagens.destroy');
                // Stream proxy do OneDrive (galeria e imagem principal)
                Route::get('veiculos/{veiculo}/imagens/{imagem}/arquivo', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'viewImagem'])
                    ->name('veiculos.imagens.view');
                Route::get('veiculos/{veiculo}/imagem-principal', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'viewImagemPrincipal'])
                    ->name('veiculos.imagem-principal');
                // OS preventiva: cadastro a partir do Dashboard de Ciclos
                Route::post('veiculos/{veiculo}/os-preventiva', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeOsPreventiva'])
                    ->name('veiculos.os-preventiva.store');

                // CRUDs aninhados das abas Show
                Route::post('veiculos/{veiculo}/manutencoes', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeManutencao'])
                    ->name('veiculos.manutencoes.store');
                Route::put('manutencoes/{manutencao}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'updateManutencao'])
                    ->name('manutencoes.update');
                Route::delete('manutencoes/{manutencao}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'destroyManutencao'])
                    ->name('manutencoes.destroy');

                Route::post('veiculos/{veiculo}/ipvas', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeIpva'])
                    ->name('veiculos.ipvas.store');
                Route::put('ipvas/{ipva}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'updateIpva'])
                    ->name('ipvas.update');
                Route::delete('ipvas/{ipva}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'destroyIpva'])
                    ->name('ipvas.destroy');

                Route::post('veiculos/{veiculo}/seguros', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeSeguro'])
                    ->name('veiculos.seguros.store');
                Route::put('seguros/{seguro}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'updateSeguro'])
                    ->name('seguros.update');
                Route::delete('seguros/{seguro}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'destroySeguro'])
                    ->name('seguros.destroy');

                Route::post('veiculos/{veiculo}/docs-legais', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeDocLegal'])
                    ->name('veiculos.docs-legais.store');
                Route::put('docs-legais/{doc}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'updateDocLegal'])
                    ->name('docs-legais.update');
                Route::delete('docs-legais/{doc}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'destroyDocLegal'])
                    ->name('docs-legais.destroy');

                Route::post('veiculos/{veiculo}/docs-tecnicos', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'storeDocTecnico'])
                    ->name('veiculos.docs-tecnicos.store');
                Route::put('docs-tecnicos/{doc}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'updateDocTecnico'])
                    ->name('docs-tecnicos.update');
                Route::delete('docs-tecnicos/{doc}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'destroyDocTecnico'])
                    ->name('docs-tecnicos.destroy');

                // Stream proxy de anexos das abas (PDF/imagem direto do OneDrive)
                Route::get('anexos/{tipo}/{id}', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'viewAnexo'])
                    ->where('tipo', 'manutencao|ipva|doc-legal|doc-tecnico')
                    ->name('anexos.view');

                // Caderno Histórico de Manutenção (timeline read-only)
                Route::get('veiculos/{veiculo}/historico-mnt', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'historicoMnt'])
                    ->name('veiculos.historico-mnt');

                // Download de toda a documentação do veículo em ZIP (OneDrive)
                Route::get('veiculos/{veiculo}/zip-docs', [\App\Http\Controllers\Admin\Frota\VeiculoController::class, 'downloadZipDocs'])
                    ->name('veiculos.zip-docs');

                // Veiculos — CRUD completo (com show)
                Route::resource('veiculos', \App\Http\Controllers\Admin\Frota\VeiculoController::class);

                // Locacoes — vinculo veiculo<->funcionario por obra
                Route::resource('locacoes', \App\Http\Controllers\Admin\Frota\VeiculoLocacaoController::class)
                    ->except(['show']);

                // Modelos de checklist (catalogo)
                Route::resource('checklists', \App\Http\Controllers\Admin\Frota\VeiculoChecklistController::class)
                    ->except(['show']);

                // Itens de checklist (nested em checklists)
                Route::resource('checklists.itens', \App\Http\Controllers\Admin\Frota\VeiculoChecklistItemController::class)
                    ->only(['index', 'store', 'update', 'destroy']);

                // Execucoes de checklist (auditoria do que o mobile enviou)
                Route::resource('checklist-execucoes', \App\Http\Controllers\Admin\Frota\VeiculoChecklistServicoController::class)
                    ->only(['index', 'show', 'destroy']);

                // Abastecimentos
                Route::resource('abastecimentos', \App\Http\Controllers\Admin\Frota\VeiculoAbastecimentoController::class)
                    ->except(['show']);

                // Diario de Bordo — mobile cria, admin lista/edita/remove
                Route::resource('diario', \App\Http\Controllers\Admin\Frota\VeiculoDiarioBordoController::class)
                    ->only(['index', 'show', 'update', 'destroy']);

                // Horimetros — somente listagem e remocao (criados pelo mobile)
                Route::resource('horimetros', \App\Http\Controllers\Admin\Frota\VeiculoHorimetroController::class)
                    ->only(['index', 'destroy']);

                // Hodometros / Quilometragem — mesma logica de horimetros
                Route::resource('quilometragem', \App\Http\Controllers\Admin\Frota\VeiculoQuilometragemController::class)
                    ->only(['index', 'destroy']);

                // Preventivas (catalogo + execucoes)
                Route::resource('preventivas', \App\Http\Controllers\Admin\Frota\VeiculoPreventivaController::class);

                // Lookups (cadastros auxiliares: categorias, subcategorias, marcas, modelos, tipos)
                Route::resource('categorias', \App\Http\Controllers\Admin\Frota\VeiculoCategoriaController::class)
                    ->only(['index', 'store', 'update', 'destroy']);
                Route::resource('subcategorias', \App\Http\Controllers\Admin\Frota\VeiculoSubCategoriaController::class)
                    ->only(['index', 'store', 'update', 'destroy']);
                Route::resource('marcas', \App\Http\Controllers\Admin\Frota\MarcaMaquinaController::class)
                    ->only(['index', 'store', 'update', 'destroy']);
                Route::resource('modelos', \App\Http\Controllers\Admin\Frota\ModeloMaquinaController::class)
                    ->only(['index', 'store', 'update', 'destroy']);
                Route::resource('tipos', \App\Http\Controllers\Admin\Frota\TiposVeiculoController::class)
                    ->only(['index', 'store', 'update', 'destroy']);
            });

            /*
            |------------------------------------------------------------------
            | Estoque (admin)
            |------------------------------------------------------------------
            | URLs base:  /admin/estoque/...
            | RouteNames: admin.estoque.*
            |
            | Controllers em App\Http\Controllers\Admin\Estoque.
            | Módulo de controle de estoque por obra (FASE 2 — catálogo).
            | Próximas fases: movimentações, requisições, inventário.
            |------------------------------------------------------------------
            */
            Route::prefix('estoque')->name('admin.estoque.')->group(function () {
                // Categorias — árvore via parent_id (CRUD inline)
                Route::resource('categorias', \App\Http\Controllers\Admin\Estoque\CategoriaController::class)
                    ->only(['index', 'store', 'update', 'destroy']);

                // Produtos — catálogo completo com foto, SKU, categoria, fornecedor padrão
                Route::resource('produtos', \App\Http\Controllers\Admin\Estoque\ProdutoController::class);

                // Movimentações — entrada / saída / transferência (FASE 3)
                // Endpoints AJUX para o form precisam vir ANTES do resource
                Route::get('movimentacoes/buscar-produtos', [\App\Http\Controllers\Admin\Estoque\MovimentacaoController::class, 'buscarProdutos'])
                    ->name('movimentacoes.buscar-produtos');
                Route::get('movimentacoes/saldo', [\App\Http\Controllers\Admin\Estoque\MovimentacaoController::class, 'saldoProdutoObra'])
                    ->name('movimentacoes.saldo');
                // Autocomplete de funcionários (retirante na SAÍDA) — FASE 7.A
                Route::get('movimentacoes/buscar-funcionarios', [\App\Http\Controllers\Admin\Estoque\MovimentacaoController::class, 'buscarFuncionarios'])
                    ->name('movimentacoes.buscar-funcionarios');
                Route::resource('movimentacoes', \App\Http\Controllers\Admin\Estoque\MovimentacaoController::class)
                    ->only(['index', 'create', 'store', 'show', 'destroy']);

                // Requisições — fluxo aprovação (FASE 4)
                // RASCUNHO → ENVIADA → APROVADA → ATENDIDA (ou REJEITADA/CANCELADA)
                Route::post('requisicoes/{requisicao}/enviar',   [\App\Http\Controllers\Admin\Estoque\RequisicaoController::class, 'enviar'])->name('requisicoes.enviar');
                Route::post('requisicoes/{requisicao}/aprovar',  [\App\Http\Controllers\Admin\Estoque\RequisicaoController::class, 'aprovar'])->name('requisicoes.aprovar');
                Route::post('requisicoes/{requisicao}/rejeitar', [\App\Http\Controllers\Admin\Estoque\RequisicaoController::class, 'rejeitar'])->name('requisicoes.rejeitar');
                Route::post('requisicoes/{requisicao}/atender',  [\App\Http\Controllers\Admin\Estoque\RequisicaoController::class, 'atender'])->name('requisicoes.atender');
                Route::post('requisicoes/{requisicao}/cancelar', [\App\Http\Controllers\Admin\Estoque\RequisicaoController::class, 'cancelar'])->name('requisicoes.cancelar');
                Route::resource('requisicoes', \App\Http\Controllers\Admin\Estoque\RequisicaoController::class);

                // Inventários — contagem física + ajustes (FASE 5)
                Route::post('inventarios/{inventario}/fechar',   [\App\Http\Controllers\Admin\Estoque\InventarioController::class, 'fechar'])->name('inventarios.fechar');
                Route::post('inventarios/{inventario}/cancelar', [\App\Http\Controllers\Admin\Estoque\InventarioController::class, 'cancelar'])->name('inventarios.cancelar');
                Route::put('inventarios/{inventario}/itens/{item}', [\App\Http\Controllers\Admin\Estoque\InventarioController::class, 'atualizarItem'])->name('inventarios.itens.update');
                Route::post('inventarios/{inventario}/itens/lote', [\App\Http\Controllers\Admin\Estoque\InventarioController::class, 'atualizarLote'])->name('inventarios.itens.lote');
                Route::resource('inventarios', \App\Http\Controllers\Admin\Estoque\InventarioController::class)
                    ->only(['index', 'create', 'store', 'show']);

                // Status biométrico de qualquer user — usado pela tela de SAÍDA
                Route::get('biometria/status/{userId}', [\App\Http\Controllers\Admin\BiometriaController::class, 'statusUsuario'])
                    ->name('admin.biometria.status');

                // Devoluções internas (FASE 7.B)
                Route::post('devolucoes/{devolucao}/aprovar',  [\App\Http\Controllers\Admin\Estoque\DevolucaoController::class, 'aprovar'])->name('devolucoes.aprovar');
                Route::post('devolucoes/{devolucao}/rejeitar', [\App\Http\Controllers\Admin\Estoque\DevolucaoController::class, 'rejeitar'])->name('devolucoes.rejeitar');
                Route::resource('devolucoes', \App\Http\Controllers\Admin\Estoque\DevolucaoController::class)
                    ->only(['index', 'create', 'store', 'show']);

                // Gestão de almoxarifes (aprovadores de devolução) — FASE 7.B+
                Route::get('almoxarifes',           [\App\Http\Controllers\Admin\Estoque\AlmoxarifeController::class, 'index'])->name('almoxarifes.index');
                Route::post('almoxarifes/toggle',   [\App\Http\Controllers\Admin\Estoque\AlmoxarifeController::class, 'toggle'])->name('almoxarifes.toggle');
                Route::post('almoxarifes/bulk',     [\App\Http\Controllers\Admin\Estoque\AlmoxarifeController::class, 'bulkSync'])->name('almoxarifes.bulk');

                // Relatórios gerenciais (FASE 6)
                Route::prefix('relatorios')->name('relatorios.')->group(function () {
                    Route::get('/',                  [\App\Http\Controllers\Admin\Estoque\RelatorioController::class, 'hub'])->name('hub');
                    Route::get('/consumo-por-obra',  [\App\Http\Controllers\Admin\Estoque\RelatorioController::class, 'consumoPorObra'])->name('consumo-por-obra');
                    Route::get('/top-produtos',      [\App\Http\Controllers\Admin\Estoque\RelatorioController::class, 'topProdutos'])->name('top-produtos');
                    Route::get('/valor-estoque',     [\App\Http\Controllers\Admin\Estoque\RelatorioController::class, 'valorEstoque'])->name('valor-estoque');
                    Route::get('/giro-estoque',      [\App\Http\Controllers\Admin\Estoque\RelatorioController::class, 'giroEstoque'])->name('giro-estoque');
                });
            });

            Route::prefix('configuracao/blog')->group(function () {
                // -----------------------------------------------------------------
                // POSTS  (admin.posts.*)
                // URL base: /admin/configuracao/blog
                // -----------------------------------------------------------------
                Route::get('/',                             [PostController::class, 'index'])->name('admin.posts.index');
                Route::get('/create',                       [PostController::class, 'create'])->name('admin.posts.create');
                Route::post('/store',                       [PostController::class, 'store'])->name('admin.posts.store');
                Route::get('/show/{post}',                  [PostController::class, 'show'])->name('admin.posts.show');
                Route::get('/edit/{post}',                  [PostController::class, 'edit'])->name('admin.posts.edit');
                Route::put('/update/{post}',                [PostController::class, 'update'])->name('admin.posts.update');
                Route::delete('/destroy/{post}',            [PostController::class, 'destroy'])->name('admin.posts.destroy');
            });

            // -----------------------------------------------------------------
            // CATEGORIAS  (admin.blog.categories.*)
            // URL: /admin/configuracao/blog/categorias/...
            // -----------------------------------------------------------------
            Route::prefix('blog/categorias')->group(function () {
                Route::get('categorias',                [AdminCategoryController::class, 'index'])->name('admin.blog.categories.index');
                Route::get('/create',                   [AdminCategoryController::class, 'create'])->name('admin.blog.categories.create');
                Route::get('/edit/{category}',          [AdminCategoryController::class, 'edit'])->name('admin.blog.categories.edit');
                Route::post('/store',                   [AdminCategoryController::class, 'store'])->name('admin.blog.categories.store');
                Route::put('/update/{category}',        [AdminCategoryController::class, 'update'])->name('admin.blog.categories.update');
                Route::delete('/destroy/{category}',    [AdminCategoryController::class, 'destroy'])->name('admin.blog.categories.destroy');
            });

            // -----------------------------------------------------------------
            // TAGS  (admin.blog.tags.*)
            // URL: /admin/configuracao/blog/tags/...
            // -----------------------------------------------------------------
            Route::prefix('blog/tags')->group(function () {
                Route::get('/',                         [AdminTagController::class, 'index'])->name('admin.blog.tags.index');
                Route::get('/create',                   [AdminTagController::class, 'create'])->name('admin.blog.tags.create');
                Route::get('/edit/{tag}',               [AdminTagController::class, 'edit'])->name('admin.blog.tags.edit');
                Route::post('/store',                   [AdminTagController::class, 'store'])->name('admin.blog.tags.store');
                Route::put('/update/{tag}',             [AdminTagController::class, 'update'])->name('admin.blog.tags.update');
                Route::delete('/destroy/{tag}',         [AdminTagController::class, 'destroy'])->name('admin.blog.tags.destroy');
            });
        });

    // routes/admin.php (ou routes/web.php com prefix admin)
    Route::prefix('admin')->name('admin.')->middleware(['auth'])->group(function () {
        Route::post('posts/{post}/images',              [PostImageController::class, 'store'])->name('posts.images.store'); // upload
        Route::patch('posts/{post}/images/order',       [PostImageController::class, 'order'])->name('posts.images.order'); // ordenar
        Route::patch('posts/{post}/images/cover',       [PostImageController::class, 'cover'])->name('posts.images.cover'); // capa
        Route::delete('posts/{post}/images/{image}',    [PostImageController::class, 'destroy'])->name('posts.images.destroy'); // remover 1
    });
    
});
