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
import { getNetworkStatus } from './hooks/useOnlineStatus';

// Chaves de storage limpas no logout (qualquer cache local do app).
const STORAGE_KEYS_TO_CLEAR = [
    'sga_auth_marker',
    'sga_user_profile_cache',
    'sga_webauthn_active',
    // NÃO limpar 'sga_forced_offline' nem 'sga_user_prefs' — são preferências
    // do dispositivo que devem sobreviver ao logout.
];

/**
 * Limpa storage local relacionado ao usuário logado.
 */
function clearLocalAuthData() {
    clearAuthMarker();
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
    clearLocalAuthData();

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
