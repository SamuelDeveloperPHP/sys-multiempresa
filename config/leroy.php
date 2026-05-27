<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fila dedicada da sincronização Leroy Merlin
    |--------------------------------------------------------------------------
    | Os jobs (pai + filhos) rodam nesta fila. Os workers spawnados pelo botão
    | escutam exatamente ela (--queue=leroy), pra não interferir na fila default.
    */
    'queue' => env('LEROY_QUEUE', 'leroy'),

    /*
    | Fila da PONTE de importação (Leroy -> estoque_produtos). Separada da
    | sincronização pra não competirem por workers.
    */
    'queue_import' => env('LEROY_QUEUE_IMPORT', 'estoque-import'),

    /*
    |--------------------------------------------------------------------------
    | Auto-spawn de workers ao clicar "Iniciar sincronização"
    |--------------------------------------------------------------------------
    | true  (dev/VPS): o botão dispara N processos `queue:work --stop-when-empty`
    |                  em background — não precisa abrir terminal.
    | false (cPanel/shared): proc_open costuma ser bloqueado e processo em
    |                  background não sobrevive — desligue e use CRON
    |                  (* * * * * php artisan queue:work --stop-when-empty --queue=leroy).
    */
    'auto_spawn_workers' => env('LEROY_AUTO_SPAWN', true),

    /*
    | Quantos workers paralelos spawnar (o usuário pediu 2).
    */
    'workers' => (int) env('LEROY_WORKERS', 2),

    /*
    | Args do worker spawnado.
    */
    'worker_timeout' => (int) env('LEROY_WORKER_TIMEOUT', 1800),
    'worker_tries'   => (int) env('LEROY_WORKER_TRIES', 2),
    'worker_memory'  => (int) env('LEROY_WORKER_MEMORY', 1024), // MB — reinicia o worker se estourar
];
