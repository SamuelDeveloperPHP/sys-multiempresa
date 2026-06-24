<?php

/**
 * Configuração do scraper do TCPOweb (PINI).
 *
 * Credenciais NUNCA ficam no código — só no .env (padrão da Leroy):
 *   TCPO_USUARIO=...
 *   TCPO_SENHA=...
 *
 * O site é ASP.NET WebForms (postback + VIEWSTATE), sem API. O cliente
 * autentica via login-replay (form post em /home/home.aspx) e mantém a sessão
 * num CookieJar (o cookie de sessão é httpOnly — não dá pra reaproveitar do
 * navegador).
 */
return [
    'base_url' => env('TCPO_BASE_URL', 'https://tcpoweb.pini.com.br'),

    'usuario'  => env('TCPO_USUARIO'),
    'senha'    => env('TCPO_SENHA'),

    // Pausa entre requisições (ms) — educado com o servidor da PINI / anti-bloqueio.
    'delay_ms' => (int) env('TCPO_DELAY_MS', 900),

    // Timeout por requisição (s).
    'timeout'  => (int) env('TCPO_TIMEOUT', 60),

    // Retentativas em falha de TRANSPORTE (queda de rede, DNS, troca de Wi-Fi/4G).
    // Backoff exponencial (2,4,8,…,60s) → aguenta a rede voltar sem abortar a
    // varredura. Não re-tenta erro de aplicação (resposta HTTP).
    'net_retries' => (int) env('TCPO_NET_RETRIES', 8),

    // Timeout só da fase de CONEXÃO (s). Conexão morta falha rápido em vez de
    // pendurar pra sempre (foi o que travou a varredura por 1h numa troca de rede).
    'connect_timeout' => (int) env('TCPO_CONNECT_TIMEOUT', 20),

    // Aborta transferência estagnada: se ficar < 1 byte/s por N s, cURL encerra
    // (socket meio-aberto após troca de rede) e o retry refaz a requisição.
    'stall_timeout' => (int) env('TCPO_STALL_TIMEOUT', 45),

    'user_agent' => env('TCPO_UA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'),

    // Caminho do CA bundle (cacert.pem) para verificação SSL. No Windows/WAMP o
    // cURL geralmente não tem CA configurado (curl.cainfo vazio) — aponte aqui.
    // Em produção, o ideal é configurar curl.cainfo no php.ini. Se vazio: verify=true.
    'ca_bundle' => env('TCPO_CA_BUNDLE') ?: null,

    // Onde gravar a colheita (relativo a storage/app).
    'harvest_dir' => env('TCPO_HARVEST_DIR', 'tcpo/scrape'),
];
