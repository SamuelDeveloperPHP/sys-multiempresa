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
