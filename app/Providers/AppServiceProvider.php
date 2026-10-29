<?php

namespace App\Providers;

use App\Http\Middleware\ModuleAccess;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);
        \Carbon\Carbon::setLocale('pt_BR');

        Route::macro('moduleAbility', function (string $ability): Route {
            if (! in_array($ability, ModuleAccess::ABILITIES, true)) {
                throw new InvalidArgumentException("Habilidade de módulo inválida: {$ability}");
            }

            $action = $this->getAction();
            $action[ModuleAccess::ROUTE_ABILITY_KEY] = $ability;

            return $this->setAction($action);
        });

        // Mantém estoque_saldos consistente com estoque_movimentacoes.
        \App\Models\Estoque\Movimentacao::observe(\App\Observers\EstoqueMovimentacaoObserver::class);
    }
}
