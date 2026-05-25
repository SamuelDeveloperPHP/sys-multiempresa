// resources/js/offline/api/client.js
// -----------------------------------------------------------------------------
// Cliente axios usado pelos repositories. Adiciona automaticamente:
//   - Accept: application/json (não Inertia)
//   - X-Requested-With: XMLHttpRequest
//   - CSRF token (cookie XSRF-TOKEN ou meta name="csrf-token")
//   - timeout adequado para 3G ruim
// -----------------------------------------------------------------------------

import axios from 'axios';

const csrfMeta = typeof document !== 'undefined'
    ? document.querySelector('meta[name="csrf-token"]')
    : null;

export const apiClient = axios.create({
    baseURL: '/api/mobile',
    timeout: 15000,
    headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfMeta?.content || '',
    },
    withCredentials: true, // mantém cookie de sessão Laravel
});

// Interceptor: retorna apenas .data e normaliza erro
apiClient.interceptors.response.use(
    (resp) => resp,
    (error) => {
        // Anexa um flag para o caller saber que é network error (offline)
        if (!error.response) {
            error.isNetworkError = true;
        }
        return Promise.reject(error);
    }
);

// Helper: verifica conexão real fazendo um GET rápido a um endpoint público.
// Usamos /health/ping (sem auth) para que funcione também na tela de login.
// Retorna true se o servidor respondeu 2xx/3xx; false em erro de rede ou timeout.
export async function pingServer(timeoutMs = 3000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch('/health/ping?ts=' + Date.now(), {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);
        return resp.ok || resp.status === 204;
    } catch {
        return false;
    }
}

export default apiClient;
