// resources/js/offline/webauthn.js
// -----------------------------------------------------------------------------
// Helper centralizado para WebAuthn via @laragear/webpass.
//
// CONFIG IMPORTANTE:
// - Por default, Webpass NÃO procura o CSRF token. Setamos findCsrfToken: true
//   para que ele leia automaticamente <meta name="csrf-token"> + cookie XSRF.
// - findXsrfToken também ativado como fallback secundário.
// - credentials: 'same-origin' garante envio de cookies de sessão Laravel.
// -----------------------------------------------------------------------------

import Webpass from '@laragear/webpass';

// -----------------------------------------------------------------------------
// IMPORTANTE: findCsrfToken/findXsrfToken passados em Webpass.create() NÃO
// funcionam — bug do laragear/webpass (a função E() interna não propaga esses
// campos do config global para cada request individual).
//
// SOLUÇÃO: lemos o CSRF token dinamicamente A CADA call e passamos como header
// explícito no objeto de options. Garantido funcionar.
// -----------------------------------------------------------------------------

const wp = Webpass.create({
    credentials: 'same-origin',
});

/**
 * Lê o CSRF token Laravel do meta tag OU cookie XSRF-TOKEN.
 * É chamado a cada request para garantir token atual.
 */
function getCsrfHeaders() {
    const headers = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    // 1) Meta tag (mais confiável — é o csrf_token() do Laravel direto)
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken && metaToken.length >= 40) {
        headers['X-CSRF-TOKEN'] = metaToken;
        return headers;
    }

    // 2) Cookie XSRF-TOKEN (fallback) — Laravel envia este criptografado
    const cookieMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (cookieMatch) {
        try {
            headers['X-XSRF-TOKEN'] = decodeURIComponent(cookieMatch[1]);
        } catch (_) {
            headers['X-XSRF-TOKEN'] = cookieMatch[1];
        }
    }

    return headers;
}

/**
 * Registra um novo dispositivo biométrico para o usuário autenticado.
 */
export async function registerBiometric() {
    const headers = getCsrfHeaders();
    return await wp.attest(
        { path: '/webauthn/register/options', headers },
        { path: '/webauthn/register', headers }
    );
}

/**
 * Autentica o usuário via biometria. Se um email for fornecido, o servidor
 * filtra credenciais para apenas esse user (mais rápido).
 *
 * @param {string|null} email
 */
export async function loginBiometric(email = null) {
    const headers = getCsrfHeaders();
    const optionsConfig = email
        ? { path: '/webauthn/login/options', body: { email }, headers }
        : { path: '/webauthn/login/options', headers };
    return await wp.assert(
        optionsConfig,
        { path: '/webauthn/login', headers }
    );
}

/**
 * Verifica se o browser suporta WebAuthn (PublicKeyCredential + secure context).
 */
export function isSupported() {
    return (
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        'PublicKeyCredential' in window &&
        typeof navigator?.credentials?.create === 'function'
    );
}

/**
 * Mapeia mensagem de erro técnica para algo amigável ao usuário.
 */
export function friendlyError(err, context = 'biometria') {
    const msg = err?.message || String(err);
    if (/NotAllowedError|ERROR_PASSTHROUGH|cancelled|cancel/i.test(msg)) {
        return 'Autenticação cancelada.';
    }
    if (/InvalidStateError|previously registered/i.test(msg)) {
        return 'Este dispositivo já está cadastrado.';
    }
    if (/NotSupportedError/i.test(msg)) {
        return 'Dispositivo não suporta biometria.';
    }
    if (/no credentials|none registered|InvalidAssertionResponse/i.test(msg)) {
        return 'Nenhuma biometria cadastrada para esta conta.';
    }
    if (/INVALID_DOMAIN|RP_ID/i.test(msg)) {
        return 'Domínio inválido para biometria. Requer HTTPS.';
    }
    return `Erro em ${context}: ${msg}`;
}

export default { registerBiometric, loginBiometric, isSupported, friendlyError };
