// resources/js/offline/webauthn.js
// -----------------------------------------------------------------------------
// Helper centralizado para WebAuthn — usa @simplewebauthn/browser DIRETO.
//
// Histórico: a versão anterior usava @laragear/webpass v2.1.2, mas esse
// pacote chama startRegistration(options) — formato deprecado pela API do
// simplewebauthn/browser v13+, que agora exige startRegistration({optionsJSON}).
// O resultado era erro "credentials creation was not completed" no console
// + warning "startRegistration() was not called correctly".
//
// Esta versão chama o simplewebauthn diretamente, garantindo compat com
// a API atual. Os endpoints no servidor (/webauthn/register/options +
// /webauthn/register) continuam os mesmos, publicados pelo laragear/webauthn.
// -----------------------------------------------------------------------------

import {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

// -----------------------------------------------------------------------------
// CSRF + fetch helper — lê o token meta/cookie a cada request
// -----------------------------------------------------------------------------

function csrfHeaders() {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    // 1) Meta tag (csrf_token() direto do Laravel)
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken && metaToken.length >= 40) {
        headers['X-CSRF-TOKEN'] = metaToken;
        return headers;
    }

    // 2) Cookie XSRF-TOKEN (fallback decodificado)
    const cookieMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (cookieMatch) {
        try { headers['X-XSRF-TOKEN'] = decodeURIComponent(cookieMatch[1]); }
        catch (_) { headers['X-XSRF-TOKEN'] = cookieMatch[1]; }
    }
    return headers;
}

async function postJson(url, body = null) {
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: csrfHeaders(),
        body: body ? JSON.stringify(body) : '{}',
    });
    if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch (_) { /* ignore */ }
        const e = new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
        e.status = res.status;
        throw e;
    }
    if (res.status === 204) return null;
    return res.json();
}

// -----------------------------------------------------------------------------
// API pública
// -----------------------------------------------------------------------------

/**
 * Registra uma nova credencial WebAuthn para o usuário autenticado.
 * Retorna { success: true } se OK, ou { success: false, error } em falha.
 */
export async function registerBiometric() {
    try {
        // 1) Servidor gera challenge + opções de registro
        const optionsJSON = await postJson('/webauthn/register/options');

        // 2) Browser/SO pede a biometria — passa { optionsJSON } conforme
        //    a API atual do @simplewebauthn/browser v13+
        const attestation = await startRegistration({ optionsJSON });

        // 3) Envia attestation pro servidor armazenar
        await postJson('/webauthn/register', attestation);

        return { success: true };
    } catch (error) {
        console.error('[registerBiometric] erro:', error);
        return { success: false, error };
    }
}

/**
 * Faz login via biometria. Se email fornecido, server filtra credenciais
 * do usuário (mais rápido); sem email, faz lookup global.
 */
export async function loginBiometric(email = null) {
    try {
        const optionsJSON = await postJson(
            '/webauthn/login/options',
            email ? { email } : null
        );

        const assertion = await startAuthentication({ optionsJSON });

        await postJson('/webauthn/login', assertion);

        return { success: true };
    } catch (error) {
        console.error('[loginBiometric] erro:', error);
        return { success: false, error };
    }
}

/**
 * Verifica se o browser suporta WebAuthn (PublicKeyCredential + plataforma OK).
 */
export function isSupported() {
    return browserSupportsWebAuthn();
}

/**
 * Mapeia mensagem de erro técnica para algo amigável ao usuário.
 */
export function friendlyError(err, context = 'biometria') {
    const msg = err?.message || String(err);
    if (/NotAllowedError|ERROR_PASSTHROUGH|cancelled|cancel|UserCancelled|Operation cancel|timed out|timeout/i.test(msg)) {
        return 'Autenticação cancelada ou tempo esgotado. Tente novamente.';
    }
    if (/InvalidStateError|previously registered|already.*registered/i.test(msg)) {
        return 'Este dispositivo/dedo já foi cadastrado. Use outro.';
    }
    if (/NotSupportedError/i.test(msg)) {
        return 'Dispositivo não suporta este método de biometria.';
    }
    if (/SecurityError|origin|HTTPS/i.test(msg)) {
        return 'Domínio inválido para biometria. Requer HTTPS (exceto em localhost).';
    }
    if (/no credentials|none registered|InvalidAssertionResponse/i.test(msg)) {
        return 'Nenhuma biometria cadastrada para esta conta.';
    }
    if (/HTTP 419/i.test(msg)) {
        return 'Sessão expirou. Recarregue a página e tente novamente.';
    }
    if (/HTTP 401|HTTP 403/i.test(msg)) {
        return 'Não autorizado. Verifique se está logado.';
    }
    return `Erro em ${context}: ${msg}`;
}

export default { registerBiometric, loginBiometric, isSupported, friendlyError };
