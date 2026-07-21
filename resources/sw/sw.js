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
// Constantes compartilhadas: cache das páginas /mobile/*, app-shell e offline.
// -----------------------------------------------------------------------------
// Cache das páginas Inertia /mobile/*. MANTIDO EM SINCRONIA com logout.js
// (CACHES_TO_CLEAR) — não renomear o valor sem alinhar lá.
const MOBILE_PAGES_CACHE = 'mobile-pages-v3';
// App-shell offline: a variante FULL-PAGE (sem X-Inertia) de /mobile/veiculos
// cacheada é um bootstrap Inertia válido e Dexie-driven (VeiculosIndex lê sempre
// do IndexedDB e ignora props). Vira o casco de QUALQUER navegação /mobile/* sem
// cache próprio, para o React montar offline em vez de morrer no offline.html.
// 1 device = 1 usuário fixo (decisão do dono) → sem preocupação cross-tenant.
const APP_SHELL_URL = '/mobile/veiculos';
// Página neutra (precacheada) para navegações sem shell ou fora de /mobile.
const OFFLINE_URL = '/offline.html';

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
        cacheName: MOBILE_PAGES_CACHE,
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

// Recupera o app-shell: o documento /mobile/veiculos cacheado. cache.match(URL)
// usa uma Request SEM X-Inertia → casa a variante FULL-PAGE (documento), nunca o
// JSON parcial do Inertia (guardado sob a chave X-Inertia:true). Retorna null se
// o shell ainda não foi cacheado (antes do 1º mount online / warmup).
async function getAppShell() {
    try {
        const cache = await caches.open(MOBILE_PAGES_CACHE);
        const cached = await cache.match(APP_SHELL_URL);
        if (!cached) return null;
        // Resposta `redirected` (ex.: 302 de sessão seguido no fetch) NÃO pode ser
        // usada numa navegação — o browser recusa. Reconstroi uma resposta limpa.
        if (cached.redirected) {
            const body = await cached.blob();
            return new Response(body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: cached.headers,
            });
        }
        return cached;
    } catch (_) {
        return null;
    }
}

setCatchHandler(async ({ request }) => {
    // Somente NAVEGAÇÕES (abrir/recarregar página) ganham fallback visual.
    if (request.mode === 'navigate') {
        // Navegação /mobile/* offline sem cache próprio: sobe o app pelo SHELL
        // (o /mobile/veiculos cacheado) para o React montar e ler do Dexie, em
        // vez do beco-sem-saída do offline.html. As 5 rotas do warmup já têm
        // cache full-page próprio (o Vary só varia de fato por X-Inertia; a
        // navegação casa a variante sem X-Inertia) e nem chegam aqui — o shell
        // cobre as NÃO-aquecidas (por-veículo, detalhe, criar/editar, etc.).
        if (new URL(request.url).pathname.startsWith('/mobile')) {
            const shell = await getAppShell();
            if (shell) return shell;
        }
        // Sem shell (ainda não cacheado) ou navegação fora de /mobile: página
        // neutra precacheada. Nunca uma página de dados de outro contexto.
        const offline = await matchPrecache(OFFLINE_URL);
        if (offline) return offline;
    }
    // XHR do Inertia, imagens, fontes, API: falha limpa. Devolver HTML aqui
    // faria o Inertia engasgar (espera JSON). Deixa o app tratar o erro.
    return Response.error();
});
