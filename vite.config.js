import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    // Força IPv4 (127.0.0.1) — alguns Windows tem problemas com IPv6 loopback ([::1])
    // que se manifesta como ERR_INTERNET_DISCONNECTED no browser ao tentar bater
    // no Vite dev server.
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        // CORS: permite que o browser, ao bater em 127.0.0.1:8000 (Laravel),
        // baixe assets do Vite em 127.0.0.1:5173 sem problemas.
        cors: {
            origin: ['http://127.0.0.1:8000', 'http://localhost:8000'],
        },
        hmr: {
            host: '127.0.0.1',
            port: 5173,
            protocol: 'ws',
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false, // registramos manualmente no app.blade.php
            strategies: 'generateSW',
            filename: 'sw.js',
            manifestFilename: 'manifest.webmanifest',
            manifest: {
                name: 'SGA Engeativos',
                short_name: 'SGA',
                description: 'Sistema de Gestão de Ativos - Engetécnica',
                theme_color: '#557bbb',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/mobile/veiculos',
                lang: 'pt-BR',
                icons: [
                    {
                        src: '/imagens/logos/adaptive-icon.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/imagens/logos/adaptive-icon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/imagens/logos/adaptive-icon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                // Atualização agressiva: novo SW assume controle imediatamente
                // sem esperar todas as abas/PWA fecharem. Sem isso, mudanças
                // no SW só pegam efeito depois do usuário fechar tudo —
                // que é exatamente o que vimos com o bug do /offline.html.
                skipWaiting: true,
                clientsClaim: true,
                // Limpa caches antigos do Workbox (evita ficar com /offline.html
                // de versões anteriores que apontavam para um arquivo inexistente).
                cleanupOutdatedCaches: true,
                // Pré-cache do app-shell (HTML/JS/CSS/fonts)
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // O offline.html mora em public/offline.html (raiz) — NÃO em
                // public/build/ — então o globPatterns não pega. Adicionamos
                // manualmente via additionalManifestEntries.
                // Revision = timestamp do build (regera cache quando muda).
                additionalManifestEntries: [
                    { url: '/offline.html', revision: String(Date.now()) },
                ],
                // Navigation Fallback: quando uma navegação falha (offline + URL
                // não está no cache de runtime), o Workbox serve essa página.
                navigateFallback: '/offline.html',
                // Não use o fallback para essas rotas (deixa a request falhar para
                // o handler natural do browser, ou para o runtimeCaching adequado).
                // OBS: /mobile/* NÃO está aqui — assim, navegações para /mobile/*
                // sem cache caem no offline.html (que tem botão para /mobile/veiculos
                // já cacheado pelo runtimeCaching).
                navigateFallbackDenylist: [
                    /^\/admin/,
                    /^\/api/,
                    /^\/logout/,
                    /^\/login/,    // login sempre bate na rede (auth via SSR)
                    /^\/health/,   // health-check público nunca cacheia
                    /^\/webauthn/, // WebAuthn API
                    /^\/_dev/,
                    /\/[^/?]+\.[^/]+$/, // arquivos com extensão (imagens, json, etc)
                ],
                runtimeCaching: [
                    {
                        // Fontes Bunny / Google
                        urlPattern: /^https:\/\/fonts\.bunny\.net\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'bunny-fonts',
                            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Font Awesome CDN
                        urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cdn-static',
                            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Imagens da galeria de veículos (servidor próprio)
                        urlPattern: /\/imagens\/veiculos\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'veiculos-imgs',
                            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Logos e ícones da marca — quase imutáveis. CacheFirst longo.
                        urlPattern: /\/imagens\/logos\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'brand-assets',
                            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // API JSON do módulo mobile — NetworkOnly: deixamos o Dexie gerenciar cache
                        urlPattern: /\/api\/mobile\/.*/i,
                        handler: 'NetworkOnly',
                        options: {
                            cacheName: 'api-mobile',
                            // Não cacheia — repositories fazem read-through manualmente
                        },
                    },
                    {
                        // Páginas Inertia /mobile/* — NetworkFirst com timeout
                        // generoso (10s) para tolerar conexões 3G/4G ruins.
                        // Antes era 4s, causando fallback prematuro no
                        // offline.html quando o servidor estava lento.
                        urlPattern: /\/mobile\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            // v2: cache antigo pode ter /offline.html como /mobile/veiculos
                            cacheName: 'mobile-pages-v2',
                            networkTimeoutSeconds: 10,
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Tela de login: NetworkFirst com timeout curto. Em offline serve cache.
                        urlPattern: ({ url }) => url.pathname === '/login' || url.pathname === '/',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'auth-shell',
                            networkTimeoutSeconds: 3,
                            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false, // não rodar SW em dev (evita confusão com hot reload)
                type: 'module',
            },
        }),
    ],
});
