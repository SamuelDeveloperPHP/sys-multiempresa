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

// Instância única com config global
const wp = Webpass.create({
    findCsrfToken: true,   // lê <meta name="csrf-token"> automaticamente
    findXsrfToken: true,   // fallback: lê cookie XSRF-TOKEN
    credentials: 'same-origin',
});

/**
 * Registra um novo dispositivo biométrico para o usuário autenticado.
 * URLs: /webauthn/register/options + /webauthn/register
 */
export async function registerBiometric() {
    return await wp.attest(
        '/webauthn/register/options',
        '/webauthn/register'
    );
}

/**
 * Autentica o usuário via biometria. Se um email for fornecido, o servidor
 * filtra credenciais para apenas esse user (mais rápido).
 *
 * @param {string|null} email
 */
export async function loginBiometric(email = null) {
    const optionsArg = email
        ? { path: '/webauthn/login/options', body: { email } }
        : '/webauthn/login/options';
    return await wp.assert(optionsArg, '/webauthn/login');
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
