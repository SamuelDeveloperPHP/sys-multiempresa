<?php

namespace App\Services\LeroyMerlin;

use Illuminate\Support\Facades\Log;

/**
 * Spawna processos `php artisan queue:work` em SEGUNDO PLANO (detached), pra que
 * o operador inicie a sincronização pela tela — sem abrir terminal.
 *
 * Estratégia por SO:
 *  - Windows: `start /B` via popen (destaca o processo do request).
 *  - Linux/Mac: `... > /dev/null 2>&1 &` via exec.
 *
 * Em hospedagem que bloqueia proc_open/popen (cPanel típico), nada é spawnado —
 * deve-se usar CRON (ver config/leroy.php). O método é defensivo: nunca derruba
 * o request se o spawn falhar.
 */
class BackgroundWorkerLauncher
{
    /**
     * Sobe N workers escutando a fila informada com --stop-when-empty
     * (processam tudo e morrem sozinhos, sem virar zumbi).
     *
     * @return int quantos workers foram efetivamente disparados
     */
    public function spawn(int $quantidade, string $fila, int $timeout = 1800, int $tries = 2): int
    {
        if ($quantidade < 1 || !$this->spawnSuportado()) {
            return 0;
        }

        $php     = PHP_BINARY;
        $artisan = base_path('artisan');
        $base    = base_path();

        $lancados = 0;
        for ($i = 0; $i < $quantidade; $i++) {
            if ($this->lancarUm($php, $artisan, $base, $fila, $timeout, $tries)) {
                $lancados++;
            }
        }
        return $lancados;
    }

    public function spawnSuportado(): bool
    {
        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
        if (PHP_OS_FAMILY === 'Windows') {
            return function_exists('popen') && !in_array('popen', $disabled, true);
        }
        return function_exists('exec') && !in_array('exec', $disabled, true);
    }

    private function lancarUm(string $php, string $artisan, string $base, string $fila, int $timeout, int $tries): bool
    {
        // $fila vem de config/leroy.php (slug confiável, ex.: 'leroy').
        $fila = preg_replace('/[^a-zA-Z0-9_\-]/', '', $fila) ?: 'leroy';

        $cmdBase = sprintf(
            '"%s" "%s" queue:work --stop-when-empty --queue=%s --tries=%d --timeout=%d --sleep=1 --no-interaction',
            $php,
            $artisan,
            $fila,
            $tries,
            $timeout
        );

        try {
            if (PHP_OS_FAMILY === 'Windows') {
                // start /B "" <cmd>  → roda detached, sem janela; "" é o título.
                $full = sprintf('cd /D "%s" && start /B "" %s > NUL 2>&1', $base, $cmdBase);
                $handle = popen($full, 'r');
                if ($handle !== false) {
                    pclose($handle);
                    return true;
                }
                return false;
            }

            // Unix: detached em background
            $full = sprintf('cd %s && %s > /dev/null 2>&1 &', escapeshellarg($base), $cmdBase);
            exec($full);
            return true;
        } catch (\Throwable $e) {
            Log::warning('BackgroundWorkerLauncher: falha ao spawnar worker', ['erro' => $e->getMessage()]);
            return false;
        }
    }
}
