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

    /*
    |--------------------------------------------------------------------------
    | Credenciais Algolia (busca de produtos da Leroy)
    |--------------------------------------------------------------------------
    | A Leroy ROTACIONA a api_key periodicamente (a antiga dá HTTP 403
    | "Invalid Application-ID or API key"). Quando isso acontece, pegue a chave
    | nova no navegador:
    |   1) Abra leroymerlin.com.br, faça uma busca/abra uma categoria.
    |   2) DevTools (F12) > aba Network > filtro "queries" (ou "algolia").
    |   3) Ache o POST p/ (algolia.net) ...1/indexes/(asterisco)/queries
    |   4) Copie os headers x-algolia-application-id e x-algolia-api-key
    |      (ou os params na query string da URL).
    |   5) Cole no .env (LEROY_ALGOLIA_API_KEY=...) e rode `php artisan config:clear`.
    |
    | O host é derivado do app_id automaticamente no scraper.
    */
    'algolia' => [
        'app_id'  => env('LEROY_ALGOLIA_APP_ID', '1CF3ZT43ZU'),
        'api_key' => env('LEROY_ALGOLIA_API_KEY', '150c68d1c61fc1835826a57a203dab72'),
        'index'   => env('LEROY_ALGOLIA_INDEX', 'production_products'),
        'regiao'  => env('LEROY_ALGOLIA_REGIAO', 'curitiba'),
    ],
];
