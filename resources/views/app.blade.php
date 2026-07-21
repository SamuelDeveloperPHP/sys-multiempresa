<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    {{-- PWA --}}
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#557bbb">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="SGA">
    <link rel="apple-touch-icon" href="/imagens/logos/icon.png">
    <link rel="icon" type="image/png" href="/imagens/logos/icon.png">
    <link rel="shortcut icon" href="/imagens/logos/icon.png">

    {{-- Font Awesome 6: importado via npm (em resources/css/app.css). Sem CDN para evitar Tracking Prevention. --}}

    {{-- Fonte Figtree --}}
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700,800&display=swap" rel="stylesheet" />

    @routes
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased bg-gray-50 text-gray-900">
    @inertia

    {{-- Service Worker --}}
    {{-- PROD: registra o SW gerado pelo Vite (PWA offline-first). --}}
    {{-- DEV:  registra o /sw.js que é um KILL-SWITCH — ele se auto-desregistra,
              limpa caches e força reload. Necessário para destravar SW antigos
              que ficaram do dia em que rodávamos PWA em dev. --}}
    @production
    <script>
        if ('serviceWorker' in navigator) {
            // Recarrega UMA vez quando um SW NOVO assume o controle (deploy com
            // skipWaiting + clientsClaim). Sem isto, uma aba aberta durante o
            // deploy pode pedir um chunk hasheado que o precache novo já removeu
            // → 404 / tela branca. O guard `hadController` evita recarregar no
            // primeiro install (quando ainda não havia controller) e o flag
            // `refreshing` evita loop de reload. Offline não dispara: sem buscar
            // um /sw.js novo, não há controllerchange — não atrapalha o campo.
            let refreshing = false;
            const hadController = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing || !hadController) return;
                refreshing = true;
                window.location.reload();
            });

            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .then(reg => console.debug('[PWA] SW registrado', reg.scope))
                    .catch(err => console.debug('[PWA] SW falhou:', err?.message));
            });
        }
    </script>
    @else
    <script>
        // === DEV: Limpeza defensiva de SW + caches residuais ===
        // NÃO registramos SW em dev. Apenas desregistramos qualquer SW residual
        // e limpamos CacheStorage.
        //
        // OBS importante: a rota Laravel /sw.js continua servindo um "kill-switch"
        // (auto-desregistra). O browser checa update do /sw.js automaticamente
        // quando há um SW registrado — ou seja, se um SW antigo ainda existir,
        // o browser pega o kill-switch sozinho e se livra dele. Não precisamos
        // forçar nada aqui (forçar causa loop de controllerchange→reload).
        //
        // Usamos sessionStorage para garantir que NÃO entremos em loop de reload.
        if ('serviceWorker' in navigator) {
            (async () => {
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    if (regs.length > 0) {
                        for (const r of regs) {
                            await r.unregister();
                            console.debug('[DEV] SW desregistrado:', r.scope);
                        }
                    }
                } catch (e) { /* ignore */ }

                try {
                    if (window.caches) {
                        const keys = await caches.keys();
                        for (const k of keys) {
                            await caches.delete(k);
                            console.debug('[DEV] Cache deletado:', k);
                        }
                    }
                } catch (e) { /* ignore */ }

                // Se algo foi limpo AGORA, recarrega UMA única vez para garantir
                // que os assets venham fresh — mas usando flag em sessionStorage
                // para nunca entrar em loop.
                const alreadyCleaned = sessionStorage.getItem('sga_dev_sw_cleaned');
                const hadSwOrCache = (await navigator.serviceWorker.getRegistrations()).length === 0;
                // Note: depois de unregister, getRegistrations() retorna 0. Não recarregamos
                // automaticamente — o próprio ato de desregistrar não força HTML novo;
                // a próxima navegação já virá fresh do servidor. Sem reload, sem loop.
                if (!alreadyCleaned) {
                    sessionStorage.setItem('sga_dev_sw_cleaned', '1');
                }
            })();
        }
    </script>
    @endproduction
</body>
</html>
