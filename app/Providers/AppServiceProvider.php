<?php

namespace App\Providers;

use App\Http\Middleware\ModuleAccess;
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Frota\VeiculoDiarioBordo;
use App\Policies\Frota\VeiculoAbastecimentoPolicy;
use App\Policies\Frota\VeiculoChecklistServicoPolicy;
use App\Policies\Frota\VeiculoDiarioBordoPolicy;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Gate;
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

        Gate::policy(VeiculoAbastecimento::class, VeiculoAbastecimentoPolicy::class);
        Gate::policy(VeiculoDiarioBordo::class, VeiculoDiarioBordoPolicy::class);
        Gate::policy(VeiculoChecklistServico::class, VeiculoChecklistServicoPolicy::class);

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
