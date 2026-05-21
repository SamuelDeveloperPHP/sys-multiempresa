<?php

return [
    /*
     * Lista de destinatários do alerta diário de preventivas vencidas.
     * Formato no .env: FROTA_ALERTAS_EMAIL=ana@ex.com,carlos@ex.com
     * Se vazio, o comando faz fallback para o email do primeiro super_admin.
     */
    'alertas_email' => array_filter(array_map('trim', explode(',', (string) env('FROTA_ALERTAS_EMAIL', '')))),

    /*
     * Mostra ciclos "aguardando" (faltando mais do que a margem) também
     * no email? Se false, manda só os vencidos e os prontos pra executar.
     */
    'incluir_aguardando_no_email' => env('FROTA_ALERTAS_INCLUIR_AGUARDANDO', false),
];
