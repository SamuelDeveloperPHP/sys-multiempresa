import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                // Pré-cache do app-shell (HTML/JS/CSS/fonts)
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // /login removido do denylist — agora cacheia a tela de login p/ offline
                navigateFallbackDenylist: [/^\/admin/, /^\/api/, /^\/logout/],
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
