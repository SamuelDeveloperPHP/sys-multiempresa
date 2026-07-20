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
            // injectManifest: SW escrito à mão em resources/sw/sw.js. Trocamos o
            // generateSW por isto para poder usar setCatchHandler — a única forma
            // de dar um fallback REAL de navegação (offline.html) quando o
            // NetworkFirst falha, sem o loop que o navigateFallback causava.
            // Ver o cabeçalho de resources/sw/sw.js para o racional completo.
            strategies: 'injectManifest',
            srcDir: 'resources/sw',
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
            // Config do MANIFEST de precache injetado em self.__WB_MANIFEST.
            // (As estratégias de runtime e o catch handler vivem no sw.js.)
            injectManifest: {
                // Pré-cache do app-shell (HTML/JS/CSS/fonts/ícones).
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // NÃO pré-cachear libs grandes de uso eventual (carregam sob demanda).
                globIgnores: [
                    '**/pdf-*.js',
                    '**/pdf.worker*.mjs',
                    '**/ort*.{js,mjs}',
                    '**/tesseract*.js',
                    '**/*.wasm',
                ],
                // Chunks maiores podem ser precacheados se necessário.
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
                // O offline.html mora em public/offline.html (raiz), fora de
                // public/build/ — então o globPatterns não o pega. Adicionamos
                // manualmente para o catch handler poder servi-lo do precache.
                // Revision = timestamp do build (regera quando muda).
                additionalManifestEntries: [
                    { url: '/offline.html', revision: String(Date.now()) },
                ],
            },
            devOptions: {
                enabled: false, // não rodar SW em dev (evita confusão com hot reload)
                type: 'module',
            },
        }),
    ],
});
