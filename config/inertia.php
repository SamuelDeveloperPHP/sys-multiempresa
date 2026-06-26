<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Server Side Rendering (SSR)
    |--------------------------------------------------------------------------
    | Este app NÃO usa SSR (renderização é client-side). O padrão do pacote vem
    | com `enabled => true`, o que faz cada página tentar contatar o servidor
    | SSR (127.0.0.1:13714) a cada render — quando ele não existe, isso degrada
    | a resposta. Mantemos DESLIGADO.
    */
    'ssr' => [
        'enabled' => false,
    ],

];
