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
