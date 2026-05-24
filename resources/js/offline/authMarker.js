// resources/js/offline/authMarker.js
// -----------------------------------------------------------------------------
// "Auth Marker" — flag persistida no localStorage que indica que o usuário
// já completou um login bem-sucedido NESTE dispositivo/browser.
//
// PROBLEMA QUE ISSO RESOLVE:
// Em modo offline, o PWA não consegue validar a sessão Laravel (cookie HttpOnly
// + validação server-side). Resultado: ao abrir o PWA offline, mesmo já tendo
// logado antes, o usuário cai na tela de /login sem ter como prosseguir.
//
// COMO FUNCIONA:
// Quando o MobileLayout monta com `auth.user` populado (= usuário autenticado
// pelo Laravel), gravamos um marker contendo {id, name, email, type, ts}.
// Quando o PWA abre offline e o /login monta:
//   - Se o marker existe → redireciona automaticamente para /mobile/veiculos
//     (o SW serve do cache, o React lê o auth do JSON cacheado, app funciona)
//   - Se o marker NÃO existe → mantém /login (usuário precisa logar online)
//
// SEGURANÇA:
// O marker é APENAS um indicador. Ele NÃO substitui a autenticação real do
// Laravel. Quando a internet voltar, qualquer request a /api/* será validada
// server-side. Se a sessão expirou no servidor, o usuário será redirecionado
// para /login normalmente.
// -----------------------------------------------------------------------------

const KEY = 'sga_auth_marker';

/**
 * Persiste marker indicando que este usuário logou com sucesso no app.
 * Chame quando tiver acesso a `auth.user` válido (no MobileLayout, por ex).
 *
 * @param {Object} user - objeto auth.user do Inertia ({id, name, email, type, ...})
 */
export function setAuthMarker(user) {
    if (typeof window === 'undefined' || !user?.id) return;
    try {
        const data = {
            id: user.id,
            name: user.name || '',
            email: user.email || '',
            type: user.type || '',
            ts: Date.now(),
        };
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) { /* localStorage indisponível, ignore */ }
}

/**
 * Lê o marker. Retorna null se não existe ou está corrompido.
 *
 * @returns {{id: number, name: string, email: string, type: string, ts: number}|null}
 */
export function getAuthMarker() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.id) return null;
        return data;
    } catch (_) {
        return null;
    }
}

/**
 * Remove o marker. Chame no logout para forçar login na próxima vez.
 */
export function clearAuthMarker() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(KEY);
    } catch (_) { /* ignore */ }
}

/**
 * Helper que retorna true se há marker E está em modo offline.
 * Útil para decidir se faz auto-bypass do /login.
 */
export function shouldBypassLoginOffline() {
    if (typeof navigator === 'undefined') return false;
    if (navigator.onLine) return false;
    return getAuthMarker() !== null;
}

export default { setAuthMarker, getAuthMarker, clearAuthMarker, shouldBypassLoginOffline };
