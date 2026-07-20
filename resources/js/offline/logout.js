// resources/js/offline/logout.js
// -----------------------------------------------------------------------------
// Logout seguro para PWA — funciona online E offline.
//
// PROBLEMA QUE ISSO RESOLVE:
// O <Link href="/logout" method="post"> do Inertia SEMPRE tenta fazer POST.
// Se o usuário está sem internet e clica "Sair", o request falha com
// ERR_INTERNET_DISCONNECTED. Como nada acontece visualmente, o usuário
// clica de novo, de novo, gerando vários erros no console.
//
// COMPORTAMENTO:
//   - Online  : POST /logout via Inertia → Laravel invalida sessão → redirect
//   - Offline : limpa marker + storage local + redirect direto pra /login
//               (servidor verá sessão ainda ativa, mas o usuário não vai
//                conseguir voltar sem logar novamente porque limpamos o
//                marker que dispara o bypass)
// -----------------------------------------------------------------------------

import { router } from '@inertiajs/react';
import { clearAuthMarker } from './authMarker';
import { clearOfflineSession } from './offlineAuth';
import { getNetworkStatus } from './hooks/useOnlineStatus';

// Chaves de storage limpas no logout (qualquer cache local do app).
const STORAGE_KEYS_TO_CLEAR = [
    'sga_auth_marker',
    'sga_user_profile_cache',
    'sga_webauthn_active',
    // NÃO limpar 'sga_forced_offline' nem 'sga_user_prefs' — são preferências
    // do dispositivo que devem sobreviver ao logout.
];

// Caches da Cache API (Workbox) que guardam conteúdo AUTENTICADO / por-empresa.
// Precisam ser apagados no logout: se outro usuário logar no mesmo dispositivo,
// uma navegação com rede instável (via catch handler do SW) poderia servir a
// página cacheada do usuário anterior — vazamento entre usuários/empresas.
// NÃO apagamos os públicos (bunny-fonts, cdn-static, brand-assets) nem o
// precache do app-shell (código, não dados).
const CACHES_TO_CLEAR = [
    'mobile-pages-v3', // páginas Inertia do usuário (abastecimentos, diário, etc.)
    'auth-shell',      // /login e / cacheados
    'veiculos-imgs',   // imagens de veículos são escopadas por empresa
];

/**
 * Limpa storage local relacionado ao usuário logado.
 *
 * IMPORTANTE: encerra a SESSÃO offline mas MANTÉM a credencial PBKDF2
 * (db.credenciais) — assim, após o logout, o usuário ainda consegue entrar
 * offline digitando a senha (validada contra o hash local).
 */
async function clearLocalAuthData() {
    clearAuthMarker();
    // Aguarda: o redirect logo em seguida abortaria a escrita no IndexedDB e
    // deixaria a sessão offline viva após o logout.
    try { await clearOfflineSession(); } catch (_) { /* best-effort */ }

    // Apaga os caches da Cache API com conteúdo autenticado (best-effort).
    // Awaited pelo mesmo motivo do IndexedDB: o redirect não pode cortar antes.
    if (typeof caches !== 'undefined') {
        try {
            await Promise.all(CACHES_TO_CLEAR.map((name) => caches.delete(name)));
        } catch (_) { /* best-effort — nunca bloqueia o logout */ }
    }

    if (typeof localStorage === 'undefined') return;
    for (const key of STORAGE_KEYS_TO_CLEAR) {
        try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    }
}

/**
 * Faz logout. Decide o caminho em runtime baseado em conectividade real.
 *
 * @param {Object} [opts]
 * @param {string} [opts.redirectTo='/login'] - Para onde ir após logout.
 * @param {boolean} [opts.forceOffline] - Força caminho offline mesmo se online.
 */
export async function logoutSafely(opts = {}) {
    const { redirectTo = '/login', forceOffline = false } = opts;

    // Limpa storage local primeiro — em ambos os caminhos.
    await clearLocalAuthData();

    // Decide se vai tentar POST (precisa de internet REAL, não só navigator.onLine)
    const { online } = getNetworkStatus();
    const tryServer = online && !forceOffline;

    if (tryServer) {
        // Caminho online: Inertia faz POST → Laravel destrói sessão → redirect.
        // onError não vai disparar request infinito porque o Inertia faz só 1
        // request por chamada. Se mesmo assim falhar (ex: 5xx), o catch faz
        // o redirect manual.
        try {
            router.post('/logout', {}, {
                preserveScroll: false,
                onError: () => {
                    window.location.href = redirectTo;
                },
            });
        } catch (_) {
            window.location.href = redirectTo;
        }
        return;
    }

    // Caminho offline: redireciona direto, sem tentar bater no servidor.
    // O servidor ainda terá a sessão ativa, mas como o auth marker foi
    // limpo, o auto-bypass do /login não dispara mais.
    window.location.href = redirectTo;
}

export default logoutSafely;
