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

// Helper: verifica conexão real fazendo um HEAD rápido
export async function pingServer(timeoutMs = 3000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch('/api/mobile/ping', {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);
        return resp.ok;
    } catch {
        return false;
    }
}

export default apiClient;
