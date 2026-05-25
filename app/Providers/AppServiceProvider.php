<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

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

        // Mantém estoque_saldos consistente com estoque_movimentacoes.
        \App\Models\Estoque\Movimentacao::observe(\App\Observers\EstoqueMovimentacaoObserver::class);
    }
}
