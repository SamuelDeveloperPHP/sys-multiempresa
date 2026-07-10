<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Alerta diario de preventivas vencidas (8h da manha, hora de SP)
Schedule::command('frota:alertar-preventivas')
    ->dailyAt('08:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping()
    ->runInBackground();

// Snapshot mensal de depreciacao da frota (dia 1, 03:00, hora de SP)
Schedule::command('frota:calcular-depreciacao')
    ->monthlyOn(1, '03:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping()
    ->runInBackground();

// Alerta semanal de pneus com sulco critico (segunda, 07:00, hora de SP)
Schedule::command('frota:alertar-pneus')
    ->weeklyOn(1, '07:00')
    ->timezone('America/Sao_Paulo')
    ->withoutOverlapping()
    ->runInBackground();
