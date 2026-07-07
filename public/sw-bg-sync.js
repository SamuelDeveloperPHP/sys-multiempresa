// public/sw-bg-sync.js
// -----------------------------------------------------------------------------
// Background Sync (arquitetura.md §7) — BÔNUS Android/Chrome.
//
// Anexado ao Service Worker gerado pelo VitePWA via workbox.importScripts.
// Quando o app registra a tag 'sga-sync-pendentes' (syncQueue.js), o browser
// dispara o evento 'sync' assim que houver conectividade — MESMO com o app
// fechado — e este handler reenvia a fila de mutações pendentes.
//
// REGRAS (agent.md #5): nunca dependa disto. iOS/Safari não suporta SyncManager
// e este arquivo simplesmente nunca é acionado lá — o envio manual com o app
// aberto continua sendo o caminho principal em todas as plataformas.
//
// SEGURANÇA DO REPLAY: os creates carregam client_uuid e o servidor deduplica;
// updates são PUT idempotentes; DELETE 404 = já apagado. Portanto, mesmo que o
// app e este handler enviem o mesmo item (corrida), não há duplicação.
//
// RECONCILIAÇÃO: este handler NÃO mexe nas tabelas de dados locais (a lógica
// de onSyncSuccess vive no bundle do app). Ele marca o item da fila com
// sw_processed=true + server_data; na próxima abertura do app,
// syncQueue.reconcileSwResults() aplica o resultado aos registros locais.
// -----------------------------------------------------------------------------

/* eslint-disable no-restricted-globals */

const SGA_SYNC_TAG = 'sga-sync-pendentes';
const SGA_DB_NAME = 'sga_engeativos_offline';
const SGA_QUEUE_STORE = 'sync_queue';
const SGA_API_BASE = '/api/mobile';
const SGA_MAX_POR_SYNC = 30; // orçamento de execução do evento é limitado

self.addEventListener('sync', (event) => {
    if (event.tag === SGA_SYNC_TAG) {
        event.waitUntil(sgaProcessarFilaPendentes());
    }
});

// Abre o IndexedDB SEM versão (não cria/upgrada — se o app nunca rodou aqui,
// não há o que sincronizar).
function sgaOpenDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(SGA_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = () => {
            // DB não existia — aborta a criação vazia.
            req.transaction.abort();
            reject(new Error('DB local inexistente'));
        };
    });
}

function sgaGetAll(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SGA_QUEUE_STORE, 'readonly');
        const req = tx.objectStore(SGA_QUEUE_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

function sgaPut(db, item) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SGA_QUEUE_STORE, 'readwrite');
        const req = tx.objectStore(SGA_QUEUE_STORE).put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// CSRF: o grupo de middleware 'web' exige token. O SW não tem document.cookie,
// mas o Cookie Store API existe em todo browser que suporta Background Sync
// (Chrome/Edge/Android). Laravel aceita o valor do cookie XSRF-TOKEN no header
// X-XSRF-TOKEN (mesmo mecanismo do axios).
async function sgaCsrfHeader() {
    try {
        if (!self.cookieStore) return null;
        const c = await self.cookieStore.get('XSRF-TOKEN');
        return c?.value ? decodeURIComponent(c.value) : null;
    } catch (_) {
        return null;
    }
}

async function sgaProcessarFilaPendentes() {
    let db;
    try {
        db = await sgaOpenDb();
    } catch (_) {
        return; // sem DB local — nada a fazer
    }

    try {
        const todos = await sgaGetAll(db);
        const pendentes = todos
            .filter((i) => i && (i.status === 'pending' || i.status === 'failed'))
            .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
            .slice(0, SGA_MAX_POR_SYNC);

        if (!pendentes.length) return;

        const xsrf = await sgaCsrfHeader();
        if (!xsrf) return; // sem CSRF não há como enviar — o app envia depois

        const METODO = { create: 'POST', update: 'PUT', delete: 'DELETE' };
        let houveTransitorio = false;

        for (const item of pendentes) {
            const metodo = METODO[item.op];
            if (!metodo || !item.endpoint) continue;

            let resp;
            try {
                resp = await fetch(SGA_API_BASE + item.endpoint, {
                    method: metodo,
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrf,
                    },
                    body: metodo === 'DELETE' ? undefined : JSON.stringify(item.payload || {}),
                });
            } catch (_) {
                // Rede caiu no meio do sync — marca failed e sinaliza retry
                houveTransitorio = true;
                await sgaPut(db, {
                    ...item,
                    status: 'failed',
                    attempts: (item.attempts || 0) + 1,
                    last_error: 'Falha de rede durante Background Sync',
                    updated_at: new Date().toISOString(),
                });
                continue;
            }

            if (resp.ok || (metodo === 'DELETE' && resp.status === 404)) {
                let serverData = null;
                try {
                    const j = await resp.json();
                    serverData = j?.data ?? j?.record ?? j ?? null;
                } catch (_) { /* corpo vazio (ex.: DELETE) */ }
                await sgaPut(db, {
                    ...item,
                    status: 'completed',
                    sw_processed: true,     // reconciliado pelo app na próxima abertura
                    server_data: serverData,
                    last_error: null,
                    updated_at: new Date().toISOString(),
                });
            } else if (resp.status === 401 || resp.status === 419) {
                // Sessão expirou: nada mais vai passar — para tudo, sem retry.
                return;
            } else if (resp.status >= 500 || resp.status === 408 || resp.status === 429) {
                houveTransitorio = true;
                await sgaPut(db, {
                    ...item,
                    status: 'failed',
                    attempts: (item.attempts || 0) + 1,
                    last_error: `HTTP ${resp.status} no Background Sync`,
                    updated_at: new Date().toISOString(),
                });
            } else {
                // 4xx permanente — mesma semântica do syncQueue do app
                let msg = `HTTP ${resp.status}`;
                try {
                    const j = await resp.json();
                    if (j?.message) msg = j.message;
                } catch (_) { /* sem corpo */ }
                await sgaPut(db, {
                    ...item,
                    status: 'rejected',
                    sw_processed: true,     // app aplica markRecordRejected depois
                    attempts: (item.attempts || 0) + 1,
                    last_error: msg,
                    updated_at: new Date().toISOString(),
                });
            }
        }

        // Rejeitar a promise faz o browser reagendar o sync (backoff nativo).
        if (houveTransitorio) {
            throw new Error('Itens transitórios pendentes — reagendar sync');
        }
    } finally {
        try { db.close(); } catch (_) { /* ignore */ }
    }
}
