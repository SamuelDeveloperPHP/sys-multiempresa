// resources/sw/sw.js
// -----------------------------------------------------------------------------
// Service Worker do SGA Mobile — modo injectManifest (Workbox 7).
//
// POR QUE INJECTMANIFEST (e não generateSW):
// generateSW não expõe setCatchHandler. Sem ele, quando o NetworkFirst de
// /mobile/* falha (rede instável no campo) E o cache não casa — o que acontece
// SEMPRE em navegação, porque a resposta cacheada carrega `Vary: X-Inertia` e a
// navegação não manda esse header — o Workbox estoura `no-response` (erro não
// tratado no console) e a navegação morre no meio ("não ocorre o refresh").
// O `navigateFallback` do generateSW não resolve: ele serve a URL para TODA
// navegação (padrão App Shell), o que causava o loop do offline.html.
//
// A CORREÇÃO REAL: um catch handler que, SÓ em requisições de navegação com
// falha, serve o /offline.html NEUTRO (precacheado). Nunca serve uma página de
// dados cacheada — parecer do Cyber Security: o cache de páginas guarda conteúdo
// AUTENTICADO e escopado por usuário; servir cache de outro contexto vazaria
// dados entre usuários/empresas. XHR do Inertia falha de forma limpa para o
// próprio Inertia tratar (senão ele engasga recebendo HTML no lugar de JSON).
// -----------------------------------------------------------------------------

import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, NetworkOnly, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

// Atualização agressiva: o SW novo assume o controle no próximo carregamento,
// sem esperar todas as abas fecharem. Essencial para o deploy de uma correção
// de SW chegar aos clientes já abertos.
self.skipWaiting();
clientsClaim();

// Descarta precaches de versões antigas do Workbox.
cleanupOutdatedCaches();

// Precache do app-shell (injetado no build): JS/CSS/HTML/ícones/fontes +
// o /offline.html adicionado via additionalManifestEntries no vite.config.js.
precacheAndRoute(self.__WB_MANIFEST);

// Background Sync (Android/Chrome): script autocontido que reenvia a fila com o
// app fechado. Carregado APÓS o precache para não interferir no install.
// Absoluto porque o sw.js é servido na raiz (/sw.js) pela rota Laravel.
try { self.importScripts('/sw-bg-sync.js'); } catch (e) { /* ambiente sem suporte: segue sem BG sync */ }

// -----------------------------------------------------------------------------
// Runtime caching — replica exatamente o que existia no generateSW.
// -----------------------------------------------------------------------------

// Fontes Bunny
registerRoute(
    /^https:\/\/fonts\.bunny\.net\/.*/i,
    new CacheFirst({
        cacheName: 'bunny-fonts',
        plugins: [
            new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

// Font Awesome CDN
registerRoute(
    /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
    new CacheFirst({
        cacheName: 'cdn-static',
        plugins: [
            new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

// Imagens da galeria de veículos
registerRoute(
    /\/imagens\/veiculos\/.*/i,
    new CacheFirst({
        cacheName: 'veiculos-imgs',
        plugins: [
            new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

// Logos / ícones da marca
registerRoute(
    /\/imagens\/logos\/.*/i,
    new CacheFirst({
        cacheName: 'brand-assets',
        plugins: [
            new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

// API JSON do módulo mobile — NetworkOnly: o Dexie gerencia o cache de dados.
registerRoute(/\/api\/mobile\/.*/i, new NetworkOnly());

// Páginas Inertia /mobile/* — NetworkFirst com timeout generoso (3G/4G ruim).
// statuses [200]: não cacheia redirect opaco (status 0) sob a chave da página.
registerRoute(
    /\/mobile\/.*/i,
    new NetworkFirst({
        cacheName: 'mobile-pages-v3',
        networkTimeoutSeconds: 10,
        plugins: [
            new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }),
            new CacheableResponsePlugin({ statuses: [200] }),
        ],
    })
);

// Tela de login e raiz — NetworkFirst curto; offline serve o cache.
registerRoute(
    ({ url }) => url.pathname === '/login' || url.pathname === '/',
    new NetworkFirst({
        cacheName: 'auth-shell',
        networkTimeoutSeconds: 3,
        plugins: [
            new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }),
            new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
    })
);

// -----------------------------------------------------------------------------
// CATCH HANDLER — o coração da correção.
// Dispara quando NENHUM handler acima conseguiu produzir resposta (rede falhou
// + cache não casou). Antes disso virava `no-response` não tratado.
// -----------------------------------------------------------------------------
const OFFLINE_URL = '/offline.html';

setCatchHandler(async ({ request }) => {
    // Somente NAVEGAÇÕES (abrir/recarregar página) ganham fallback visual.
    // Servimos o /offline.html NEUTRO do precache — nunca uma página de dados
    // cacheada de outro contexto/usuário (isolamento multiempresa: Security).
    if (request.mode === 'navigate') {
        const offline = await matchPrecache(OFFLINE_URL);
        if (offline) return offline;
    }
    // XHR do Inertia, imagens, fontes, API: falha limpa. Devolver HTML aqui
    // faria o Inertia engasgar (espera JSON). Deixa o app tratar o erro.
    return Response.error();
});
