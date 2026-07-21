// resources/js/offline/offlineAuth.js
// -----------------------------------------------------------------------------
// Login Offline-First (arquitetura.md §5) — credencial local + sessão offline.
//
// FLUXO:
//   1º acesso  → OBRIGATORIAMENTE online. Após o Laravel validar a senha,
//                provisionamos a credencial local: hash PBKDF2-SHA256
//                (Web Crypto, salt aleatório, 310k iterações) em db.credenciais.
//   Seguintes  → o usuário pode logar OFFLINE: derivamos o PBKDF2 da senha
//                digitada e comparamos com o hash local em tempo constante.
//
// SESSÃO OFFLINE:
//   Marcador em db.meta ('offline_session') com TTL. É criado no login
//   (online ou offline) e RENOVADO a cada página carregada com o servidor
//   validando a sessão real (MobileLayout, quando online). O gate do
//   MobileLayout exige sessão válida para navegar offline.
//
// SEGURANÇA (limitações aceitas — arquitetura.md §2):
//   - Nunca armazenamos a senha em texto puro; apenas hash + salt.
//   - IndexedDB não é Keychain/Keystore: proteção inferior ao Secure Enclave,
//     aceita para este projeto (plano B: Capacitor).
//   - Lockout local: 5 tentativas erradas → bloqueia login offline por 5 min
//     (deterrente de força bruta casual; a defesa real são as 310k iterações).
// -----------------------------------------------------------------------------

import db, { getMeta, setMeta, clearAllLocal } from './db';

export const PBKDF2_ITERATIONS = 310000;   // OWASP 2023+ para PBKDF2-SHA256
const CREDENTIAL_KEY = 'atual';            // 1 credencial por device (último login online)
const SESSION_META_KEY = 'offline_session';
const ATTEMPTS_META_KEY = 'offline_login_attempts';
const PERSIST_META_KEY = 'storage_persist_requested';
const LOCAL_OWNER_META_KEY = 'local_data_owner_id'; // dono atual dos dados locais (Dexie)

export const OFFLINE_SESSION_TTL_HOURS = 24 * 7; // 7 dias, renovado a cada acesso online
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

// Espelho de EnsureCanAccessMobile::ALLOWED_TYPES (server-side). Só provisiona
// credencial offline para quem pode usar o módulo mobile.
export const MOBILE_ALLOWED_TYPES = ['super_admin', 'admin', 'manager', 'motorista'];

const hasWebCrypto = () =>
    typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.deriveBits === 'function';

// -----------------------------------------------------------------------------
// PBKDF2 (Web Crypto) + comparação em tempo constante
// -----------------------------------------------------------------------------
export async function deriveHash(password, saltU8, iterations = PBKDF2_ITERATIONS) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltU8, iterations, hash: 'SHA-256' },
        keyMaterial, 256
    );
    return new Uint8Array(bits);
}

// Compara dois Uint8Array sem short-circuit (tempo constante).
export function constantTimeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

// -----------------------------------------------------------------------------
// Credencial local (provisionada no login ONLINE bem-sucedido)
// -----------------------------------------------------------------------------
export async function provisionCredential(user, password) {
    if (!hasWebCrypto() || !user?.id || !password) return false;
    // Só usuários com acesso ao módulo mobile precisam de credencial offline —
    // evita espalhar hash de senha de outros perfis em browsers de desktop.
    if (!MOBILE_ALLOWED_TYPES.includes(user.type || '')) return false;
    try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await deriveHash(password, salt, PBKDF2_ITERATIONS);
        await db.credenciais.put({
            id: CREDENTIAL_KEY,
            user_id: user.id,
            name: user.name || '',
            email: (user.email || '').toLowerCase(),
            type: user.type || '',
            salt,
            hash,
            iterations: PBKDF2_ITERATIONS,
            provisioned_at: new Date().toISOString(),
        });
        // Login online validou a senha — zera o lockout do offline.
        await setMeta(ATTEMPTS_META_KEY, null);
        return true;
    } catch (e) {
        console.warn('[offlineAuth] provisionCredential falhou:', e?.message);
        return false;
    }
}

export async function getCredential() {
    try {
        return await db.credenciais.get(CREDENTIAL_KEY) || null;
    } catch (_) {
        return null;
    }
}

export async function clearCredential() {
    try { await db.credenciais.delete(CREDENTIAL_KEY); } catch (_) { /* ignore */ }
}

// -----------------------------------------------------------------------------
// Lockout de tentativas offline
// -----------------------------------------------------------------------------
async function getLockState() {
    const st = await getMeta(ATTEMPTS_META_KEY, null);
    if (!st) return { count: 0, lockedUntil: null };
    if (st.lockedUntil && new Date(st.lockedUntil) <= new Date()) {
        return { count: 0, lockedUntil: null }; // lockout expirou
    }
    return st;
}

async function registerFailedAttempt() {
    const st = await getLockState();
    const count = (st.count || 0) + 1;
    const lockedUntil = count >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;
    await setMeta(ATTEMPTS_META_KEY, { count, lockedUntil });
    return { count, lockedUntil, remaining: Math.max(0, MAX_ATTEMPTS - count) };
}

// -----------------------------------------------------------------------------
// Verificação de login OFFLINE
// Retorna { ok, user?, error?, lockedUntil? }
// -----------------------------------------------------------------------------
export async function verifyOfflinePassword(email, password) {
    if (!hasWebCrypto()) {
        return { ok: false, error: 'Este navegador não suporta login offline.' };
    }

    const cred = await getCredential();
    if (!cred?.hash || !cred?.salt) {
        return { ok: false, error: 'Faça o primeiro acesso online para habilitar o login offline.' };
    }

    const lock = await getLockState();
    if (lock.lockedUntil) {
        const min = Math.ceil((new Date(lock.lockedUntil) - new Date()) / 60000);
        return {
            ok: false, lockedUntil: lock.lockedUntil,
            error: `Muitas tentativas. Aguarde ${min} min ou faça login online.`,
        };
    }

    // A credencial local pertence ao ÚLTIMO usuário que logou online neste device.
    if ((email || '').toLowerCase().trim() !== cred.email) {
        // Mesma mensagem do erro de senha — não revela qual e-mail está provisionado.
        await registerFailedAttempt();
        return { ok: false, error: 'E-mail ou senha inválidos para acesso offline.' };
    }

    const hash = await deriveHash(password, new Uint8Array(cred.salt), cred.iterations || PBKDF2_ITERATIONS);
    if (!constantTimeEqual(hash, new Uint8Array(cred.hash))) {
        const { remaining } = await registerFailedAttempt();
        return {
            ok: false,
            error: remaining > 0
                ? `E-mail ou senha inválidos para acesso offline. (${remaining} tentativa(s) restante(s))`
                : `Muitas tentativas. Aguarde ${LOCKOUT_MINUTES} min ou faça login online.`,
        };
    }

    await setMeta(ATTEMPTS_META_KEY, null); // sucesso zera o contador
    const user = { id: cred.user_id, name: cred.name, email: cred.email, type: cred.type };
    await startOfflineSession(user);
    return { ok: true, user };
}

// -----------------------------------------------------------------------------
// Sessão offline (marcador com TTL em db.meta)
// -----------------------------------------------------------------------------
export async function startOfflineSession(user) {
    if (!user?.id) return;
    const now = Date.now();
    await setMeta(SESSION_META_KEY, {
        user_id: user.id,
        name: user.name || '',
        email: user.email || '',
        type: user.type || '',
        started_at: new Date(now).toISOString(),
        expires_at: new Date(now + OFFLINE_SESSION_TTL_HOURS * 3600 * 1000).toISOString(),
    });
}

// Renova a janela offline. Chamado pelo MobileLayout quando a página veio do
// servidor com sessão Laravel válida (= usuário autenticado de verdade).
export async function renewOfflineSession(user) {
    await startOfflineSession(user);
}

// Retorna a sessão se válida (não expirada); senão null.
export async function getOfflineSession() {
    try {
        const s = await getMeta(SESSION_META_KEY, null);
        if (!s?.user_id) return null;
        if (s.expires_at && new Date(s.expires_at) <= new Date()) return null;
        return s;
    } catch (_) {
        return null;
    }
}

export async function clearOfflineSession() {
    try { await setMeta(SESSION_META_KEY, null); } catch (_) { /* ignore */ }
}

// -----------------------------------------------------------------------------
// Isolamento multiempresa no MESMO device — wipe-on-user-change (parecer
// Security F1/F2).
//
// POR QUE AQUI E NÃO NO LOGOUT:
// O IndexedDB de dados (veículos, abastecimentos, diário, checklists, locações,
// obras) e a fila de sync sobrevivem ao logout DE PROPÓSITO. Se limpássemos no
// logout, um usuário que sai OFFLINE com mutações pendentes na sync_queue
// perderia esses dados antes de sincronizar (perda de dados). O vazamento entre
// usuários só existe quando um usuário DIFERENTE assume o device — então é na
// TROCA DE DONO que apagamos tudo do usuário anterior.
//
// Fonte de verdade: marcador durável em db.meta (sobrevive ao logout; NÃO é
// tocado por logout.js). Chamado no boot do MobileLayout, ANTES de renderizar
// o módulo, com o auth.user já validado pelo servidor.
// -----------------------------------------------------------------------------
export async function getLocalDataOwner() {
    return await getMeta(LOCAL_OWNER_META_KEY, null);
}

/**
 * Garante que os dados locais pertencem ao usuário logado. Se um usuário
 * DIFERENTE do dono atual entrar, apaga todo o estado local do anterior
 * (tabelas de dados + sync_queue + meta) antes de seguir.
 *
 * NUNCA apaga quando:
 *   - é o MESMO usuário (re-login, reload, reconexão) — preserva pendências;
 *   - é o primeiro acesso neste device (sem marcador) — nada a isolar.
 *
 * @param {{id:(number|string), type?:string, name?:string, email?:string}} user
 * @returns {Promise<{wiped:boolean, previousOwner:(number|string|null), owner:(number|string|null)}>}
 */
export async function ensureLocalDataOwner(user) {
    if (!user?.id) return { wiped: false, previousOwner: null, owner: null };

    const currentId = user.id;
    let previousOwner = null;
    try { previousOwner = await getLocalDataOwner(); } catch (_) { /* meta indisponível */ }

    const sameOwner = previousOwner != null && String(previousOwner) === String(currentId);

    // Mesmo usuário OU primeiro acesso (sem marcador): não apaga nada. Só
    // (re)grava o dono quando ainda não está registrado — sem perda de dados.
    if (sameOwner || previousOwner == null) {
        if (!sameOwner) {
            try { await setMeta(LOCAL_OWNER_META_KEY, currentId); } catch (_) { /* ignore */ }
        }
        return { wiped: false, previousOwner, owner: currentId };
    }

    // Usuário DIFERENTE assumiu o device → isola: apaga TODAS as tabelas de
    // dados + sync_queue + meta. Mantém a tabela de credenciais aqui e trata
    // logo abaixo (o login online do novo usuário já sobrescreveu a chave única
    // 'atual' via provisionCredential).
    await clearAllLocal({ keepCredentials: true });

    // clearAllLocal zerou o meta — re-carimba o novo dono.
    await setMeta(LOCAL_OWNER_META_KEY, currentId);

    // Remove credencial remanescente do usuário anterior. Se o login online do
    // novo usuário já reprovisionou a credencial, ela pertence a ele e é mantida.
    try {
        const cred = await getCredential();
        if (cred && String(cred.user_id) !== String(currentId)) {
            await clearCredential();
        }
    } catch (_) { /* best-effort */ }

    // Restabelece a sessão offline do novo usuário (o meta foi zerado). Ele
    // renderizou o MobileLayout com auth.user válido, então a janela é legítima.
    try { await startOfflineSession(user); } catch (_) { /* best-effort */ }

    return { wiped: true, previousOwner, owner: currentId };
}

// -----------------------------------------------------------------------------
// Storage persistente (arquitetura.md §2 — iOS pode limpar storage de PWA
// pouco usado; persist() pede ao browser para proteger o IndexedDB).
// Idempotente: só pede uma vez por device (flag em meta).
// -----------------------------------------------------------------------------
export async function ensurePersistentStorage() {
    try {
        if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
        const asked = await getMeta(PERSIST_META_KEY, false);
        const already = await navigator.storage.persisted();
        if (already) return true;
        if (asked) return false; // já pedimos e o browser negou — não insiste
        const granted = await navigator.storage.persist();
        await setMeta(PERSIST_META_KEY, true);
        return granted;
    } catch (_) {
        return false;
    }
}

export default {
    deriveHash,
    constantTimeEqual,
    provisionCredential,
    getCredential,
    clearCredential,
    verifyOfflinePassword,
    startOfflineSession,
    renewOfflineSession,
    getOfflineSession,
    clearOfflineSession,
    getLocalDataOwner,
    ensureLocalDataOwner,
    ensurePersistentStorage,
    PBKDF2_ITERATIONS,
    OFFLINE_SESSION_TTL_HOURS,
};
