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
                // Pré-cache do app-shell (HTML/JS/CSS/fonts)
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // Navigation Fallback: quando uma navegação falha (offline + URL não
                // está no cache de runtime), o Workbox serve essa página. Ela está
                // em public/offline.html e é precacheada automaticamente porque
                // bate com globPatterns *.html.
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
                        // Páginas Inertia /mobile/* — NetworkFirst para sempre pegar última versão
                        urlPattern: /\/mobile\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'mobile-pages',
                            networkTimeoutSeconds: 4,
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
