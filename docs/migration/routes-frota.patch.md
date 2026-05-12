# Patch — Rotas admin/Frota em `routes/web.php`

Adicionar dentro do grupo `auth` + `verified` + `company` existente em `routes/web.php`.

```php
use App\Http\Controllers\Admin\Frota\VeiculoController;

Route::middleware(['auth', 'company'])
    ->prefix('admin/frota')
    ->name('admin.frota.')
    ->group(function () {
        // Veiculos (CRUD completo via Inertia)
        Route::resource('veiculos', VeiculoController::class)
            ->except(['show'])
            ->names([
                'index'   => 'veiculos.index',
                'create'  => 'veiculos.create',
                'store'   => 'veiculos.store',
                'edit'    => 'veiculos.edit',
                'update'  => 'veiculos.update',
                'destroy' => 'veiculos.destroy',
            ]);

        // TODO Fase 2.2: replicar pattern para os modulos abaixo (cada um eh um Controller similar):
        // Route::resource('abastecimentos',  AbastecimentoController::class);
        // Route::resource('diario',          DiarioBordoController::class);
        // Route::resource('horimetros',      HorimetroController::class);
        // Route::resource('quilometragem',   QuilometragemController::class);
        // Route::resource('checklists',      ChecklistController::class);
        // Route::resource('locacoes',        LocacaoController::class);
        // Route::resource('preventivas',     PreventivaController::class);
    });
```

## Registrar `routes/api-app.php` (API mobile)

Editar `bootstrap/app.php`:

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api-app.php',   // <-- adicionar esta linha
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ...
```

Sanctum precisa estar instalado e o token guard ativado. Se ainda nao estiver:

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

E em `config/auth.php`, garantir que existe o guard `sanctum`:

```php
'guards' => [
    'web' => ['driver' => 'session', 'provider' => 'users'],
    'sanctum' => ['driver' => 'sanctum', 'provider' => 'users'],
],
```

E o middleware `EnsureFrontendRequestsAreStateful` (padrao Sanctum) deve estar registrado para rotas web — mas as rotas em `routes/api-app.php` usam apenas `auth:sanctum` (bearer token), nao precisam de cookie/CSRF.
