// resources/js/offline/warmupCache.js
// -----------------------------------------------------------------------------
// Pre-warm do cache de navegação do Service Worker.
//
// PROBLEMA QUE ISSO RESOLVE:
// O runtimeCaching `/mobile/*` é NetworkFirst — só cacheia DEPOIS da primeira
// navegação online a essa URL. Resultado: se o usuário faz login e abre só
// /mobile/veiculos, depois ativa modo avião e tenta /mobile/abastecimentos,
// não há cache dessa URL e o app falha.
//
// SOLUÇÃO:
// Logo após o app carregar (e estando online), fazemos `fetch()` em background
// das URLs principais. O Service Worker intercepta esses fetches pelo
// runtimeCaching e popula o cache `mobile-pages`. A partir desse momento,
// qualquer navegação offline para essas rotas funciona via cache.
//
// Características:
//   - Idempotente: pode ser chamado várias vezes (Workbox revalida e atualiza)
//   - Não-bloqueante: requests são disparadas em paralelo, sem await em série
//   - Silencioso: erros são engolidos (offline ou 401 não afeta o app)
//   - Throttled: roda no máximo a cada 5 minutos para não inundar a rede
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'sga_warmup_last_ts';
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutos

// URLs cacheáveis. NÃO inclua /api/* aqui — APIs JSON devem ir pelo Dexie,
// não pelo cache de navegação.
const URLS_TO_WARMUP = [
    '/mobile/veiculos',
    '/mobile/abastecimentos',
    '/mobile/diario-bordo',
    '/mobile/checklists',
    '/mobile/locacoes',
];

/**
 * Faz pre-warm do cache de navegação mobile.
 * Chame com `await` se precisar do resultado, ou fire-and-forget.
 *
 * @param {Object} opts
 * @param {boolean} [opts.force=false]  - Ignora throttle e força execução
 * @param {string[]} [opts.urls]        - Override da lista padrão
 * @returns {Promise<{warmed: number, skipped: boolean}>}
 */
export async function warmupMobileCache({ force = false, urls = URLS_TO_WARMUP } = {}) {
    // Não roda no servidor (SSR)
    if (typeof window === 'undefined') return { warmed: 0, skipped: true };

    // Só faz sentido com Service Worker registrado
    if (!('serviceWorker' in navigator)) return { warmed: 0, skipped: true };

    // E estando online — sem rede, fetch falha e não cacheia nada
    if (!navigator.onLine) return { warmed: 0, skipped: true };

    // Throttle: evita inundar a rede em cada navegação
    if (!force) {
        try {
            const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
            if (Date.now() - last < THROTTLE_MS) {
                return { warmed: 0, skipped: true };
            }
        } catch (_) { /* localStorage indisponível, segue */ }
    }

    // Aguarda o SW estar pronto (caso ainda esteja instalando)
    try {
        await navigator.serviceWorker.ready;
    } catch (_) {
        return { warmed: 0, skipped: true };
    }

    // Dispara fetches em paralelo. cache: 'reload' força ida à rede para
    // que o Workbox NetworkFirst grave a resposta nova no cache.
    const results = await Promise.allSettled(
        urls.map((url) =>
            fetch(url, {
                credentials: 'same-origin',
                cache: 'reload',
                // Evita que o browser cancele cedo demais
                keepalive: true,
            }).then((r) => (r.ok ? r : Promise.reject(new Error(`HTTP ${r.status}`))))
        )
    );

    const warmed = results.filter((r) => r.status === 'fulfilled').length;

    try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (_) { /* ignore */ }

    if (warmed > 0 && typeof console !== 'undefined') {
        console.debug(`[PWA] Cache pre-warm: ${warmed}/${urls.length} URLs cacheadas.`);
    }

    return { warmed, skipped: false };
}

/**
 * Limpa o throttle, forçando o próximo warmup a executar imediatamente.
 * Útil após login bem-sucedido, por exemplo.
 */
export function resetWarmupThrottle() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (_) { /* ignore */ }
}

export default warmupMobileCache;
