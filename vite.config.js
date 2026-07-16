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
        // CORS: permite que o browser baixe assets do Vite em 127.0.0.1:5173
        // independente da porta em que o Laravel esteja rodando.
        // Use regex pra cobrir 127.0.0.1:<qualquer-porta> + localhost:<porta>
        // (php artisan serve --port=8070 etc).
        cors: {
            origin: [
                /^http:\/\/127\.0\.0\.1:\d+$/,
                /^http:\/\/localhost:\d+$/,
            ],
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
                description: 'Sistema de Gestão de Ativos - Engetecnica',
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
                // Background Sync (bônus Android/Chrome — arquitetura.md §7):
                // script autocontido anexado ao SW gerado. Absoluto porque o
                // sw.js é servido na raiz (/sw.js) pela rota Laravel.
                importScripts: ['/sw-bg-sync.js'],
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
                // NÃO pré-cachear libs grandes e de uso eventual — elas carregam
                // sob demanda (lazy import). Mantém o app-shell leve e a instalação
                // do SW rápida (evita baixar ~2 MB de ONNX/PDF.js/Tesseract à toa).
                globIgnores: [
                    '**/pdf-*.js',
                    '**/pdf.worker*.mjs',
                    '**/ort*.{js,mjs}',
                    '**/tesseract*.js',
                    '**/*.wasm',
                ],
                // Permite que chunks maiores sejam cacheados em runtime se necessário.
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
                // O offline.html mora em public/offline.html (raiz) — NÃO em
                // public/build/ — então o globPatterns não pega. Adicionamos
                // manualmente via additionalManifestEntries.
                // Revision = timestamp do build (regera cache quando muda).
                additionalManifestEntries: [
                    { url: '/offline.html', revision: String(Date.now()) },
                ],
                // Precisa ser null EXPLICITAMENTE, não apenas omitido: o
                // vite-plugin-pwa tem default navigateFallback: 'index.html', e
                // omitir a chave faz o default valer — gerando um NavigationRoute
                // preso a um index.html que nem existe neste app (Laravel, não SPA),
                // sem denylist alguma. Pior que o bug original.
                navigateFallback: null,
                // NÃO usar navigateFallback com URL aqui. Apesar do nome, ele não é um
                // "fallback quando a navegação falha": é o padrão App Shell, e
                // serve a URL indicada em TODA navegação, direto do precache,
                // sem nunca tentar a rede. Com navigateFallback: '/offline.html'
                // qualquer acesso direto ou F5 em /mobile/* servia a tela de
                // offline mesmo online — e como o offline.html reconhece que há
                // conexão e recarrega, virava loop infinito de reload.
                // (Só não aparecia navegando pelo app porque o Inertia troca de
                // página por XHR, que não é navegação e portanto não passava aqui.)
                // As navegações agora caem no runtimeCaching abaixo: auth-shell
                // para /login e /, mobile-pages-v3 para /mobile/*. O suporte
                // offline vem desses caches NetworkFirst.
                // Um offline.html de verdade exigiria injectManifest + um sw.js
                // próprio com setCatchHandler — que é o mecanismo que realmente
                // significa "se falhar, sirva isto". generateSW não expõe isso.
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
                            // v3: os caches v2 podem ter guardado o offline.html (ou um
                            // redirect opaco) sob a chave /mobile/veiculos. Renomear
                            // descarta esse lixo em vez de servi-lo.
                            cacheName: 'mobile-pages-v3',
                            networkTimeoutSeconds: 10,
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
                            // Só 200. Requisição de navegação tem redirect:'manual', então
                            // o 302 para /login (sessão expirada) volta como resposta
                            // opaqueredirect de status 0 — e com 0 na lista ela seria
                            // gravada sob a chave /mobile/veiculos, fazendo o cache
                            // devolver "vá para /login" para sempre. Rota same-origin
                            // não tem motivo legítimo para cachear status 0.
                            cacheableResponse: { statuses: [200] },
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
