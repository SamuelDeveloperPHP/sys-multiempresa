// resources/js/offline/syncQueue.js
// -----------------------------------------------------------------------------
// Fila de mutações offline. Cada chamada CRUD do repository registra um item
// aqui. Quando o usuário clica "Sincronizar agora" (botão manual), processAll()
// despacha cada item para o endpoint correspondente.
//
// status:
//   'pending'   — aguardando envio
//   'sending'   — em transmissão
//   'failed'    — erro TRANSITÓRIO (rede/5xx/408/429): retentado na próxima sync
//   'rejected'  — erro PERMANENTE (4xx, ex.: 422): NÃO retenta sozinho; o usuário
//                 decide entre "Tentar novamente" (retryRejected) e "Descartar"
//                 (discardRejected) na UI de sincronização
//   'completed' — enviado com sucesso (mantido por 24h para auditoria, depois GC)
// -----------------------------------------------------------------------------

import db, { newLocalId } from './db';
import apiClient from './api/client';

// Mapa de operações → método HTTP padrão
const HTTP_METHOD = {
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
};

// -----------------------------------------------------------------------------
// Enqueue: chamado pelos repositories ao salvar/atualizar/excluir offline
// -----------------------------------------------------------------------------
export async function enqueue({ table, op, payload, endpoint, local_id = null, server_id = null }) {
    if (!['create', 'update', 'delete'].includes(op)) {
        throw new Error(`syncQueue.enqueue: op inválida '${op}'`);
    }
    const now = new Date().toISOString();
    const id = await db.sync_queue.add({
        table,
        op,
        payload,
        endpoint,             // ex: '/abastecimentos' ou '/abastecimentos/123'
        local_id,             // se for um create offline, é o id temporário
        server_id,            // id real do servidor (para update/delete)
        attempts: 0,
        last_error: null,
        status: 'pending',
        created_at: now,
        updated_at: now,
    });
    // Bônus Android/Chrome: agenda envio em background (app fechado).
    // Fire-and-forget — iOS/Safari não suporta e o envio manual continua
    // sendo o caminho principal (arquitetura.md §7).
    registerBackgroundSync();
    return id;
}

// -----------------------------------------------------------------------------
// Background Sync (bônus Android/Chrome) — degradação limpa onde não há suporte
// -----------------------------------------------------------------------------
export const BG_SYNC_TAG = 'sga-sync-pendentes';

export async function registerBackgroundSync() {
    try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
        if (!('SyncManager' in window)) return false; // iOS/Safari: sem suporte
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register(BG_SYNC_TAG);
        return true;
    } catch (_) {
        return false; // permissão negada / SW não registrado — segue manual
    }
}

// Reconcilia itens processados pelo SW em background (public/sw-bg-sync.js):
// o SW só atualiza a FILA (sw_processed + server_data); aplicar o resultado
// nas tabelas locais (onSyncSuccess / markRecordRejected) é feito aqui, na
// próxima abertura do app. Chamado pelo MobileLayout.
export async function reconcileSwResults() {
    let aplicados = 0;
    const processados = await db.sync_queue
        .filter((i) => i.sw_processed === true)
        .toArray();

    for (const item of processados) {
        try {
            if (item.status === 'completed') {
                await onSyncSuccess(item, item.server_data || null);
            } else if (item.status === 'rejected') {
                await markRecordRejected(item, item.last_error || 'Rejeitado pelo servidor');
            }
            aplicados++;
        } catch (e) {
            console.warn('[syncQueue] reconcileSwResults:', e?.message);
        }
        await db.sync_queue.update(item.id, { sw_processed: false, server_data: null });
    }
    return aplicados;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
export async function countPending() {
    return await db.sync_queue.where('status').anyOf(['pending', 'failed']).count();
}

export async function listPending() {
    return await db.sync_queue
        .where('status').anyOf(['pending', 'failed'])
        .sortBy('created_at');
}

export async function clearCompleted(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000).toISOString();
    return await db.sync_queue
        .where('status').equals('completed')
        .filter(item => item.updated_at < cutoff)
        .delete();
}

export async function removeItem(id) {
    return await db.sync_queue.delete(id);
}

// -----------------------------------------------------------------------------
// Classificação de erro: define o destino do item na fila.
//   'transient' — rede caiu, 5xx, 408, 429  → retry (backoff) e depois 'failed'
//   'auth'      — 401/419 (sessão expirou)  → aborta a rodada, itens voltam a 'pending'
//   'permanent' — demais 4xx (400/403/404/422) → 'rejected' (reenviar não resolve)
// -----------------------------------------------------------------------------
export function classifyError(err) {
    const status = err?.response?.status;
    if (status == null) return 'transient';               // sem resposta: rede
    if (status === 401 || status === 419) return 'auth';
    if (status === 408 || status === 429 || status >= 500) return 'transient';
    return 'permanent';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry in-run com backoff exponencial (1s, 2s, …) — só para erros transitórios.
// Erros permanentes/auth estouram imediatamente para o classificador do caller.
async function sendWithRetry(fn, { attempts = 3, baseDelay = 1000 } = {}) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (classifyError(err) !== 'transient') throw err;
            if (i < attempts - 1) await sleep(baseDelay * 2 ** i);
        }
    }
    throw lastErr;
}

// Marca o registro local como rejeitado (a UI mostra o erro e oferece
// "Tentar novamente" / "Descartar").
async function markRecordRejected(item, errorMsg) {
    try {
        const key = item.op === 'create' ? item.local_id : item.server_id;
        if (key != null) {
            await db.table(item.table).update(key, {
                _sync_status: 'rejected',
                _sync_error: errorMsg,
            });
        }
    } catch (e) {
        console.warn('[syncQueue] markRecordRejected:', e?.message);
    }
}

// -----------------------------------------------------------------------------
// processAll — dispara o envio da fila. Chamado pelo botão "Sincronizar agora".
// onProgress(percent, message) é opcional.
// Retorna { sent, failed, rejected, total, aborted }.
// -----------------------------------------------------------------------------
export async function processAll(onProgress = null) {
    const items = await listPending();
    const total = items.length;
    let sent = 0;
    let failed = 0;
    let rejected = 0;
    let aborted = false;

    if (total === 0) {
        onProgress?.(100, 'Nada a sincronizar.');
        return { sent: 0, failed: 0, rejected: 0, total: 0, aborted: false };
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        onProgress?.(Math.round((i / total) * 100), `Enviando ${item.table}…`);

        await db.sync_queue.update(item.id, { status: 'sending', updated_at: new Date().toISOString() });

        try {
            const method = HTTP_METHOD[item.op];
            const url = item.endpoint;
            let response;

            try {
                response = await sendWithRetry(() => {
                    if (method === 'POST') return apiClient.post(url, item.payload);
                    if (method === 'PUT') return apiClient.put(url, item.payload);
                    return apiClient.delete(url);
                });
            } catch (err) {
                // DELETE de registro que já não existe no servidor = sucesso
                if (item.op === 'delete' && err?.response?.status === 404) {
                    response = null;
                } else {
                    throw err;
                }
            }

            // Sucesso: atualiza o registro local com o id real e marca synced
            const serverData = response?.data?.data || response?.data?.record || response?.data;
            await onSyncSuccess(item, serverData);

            await db.sync_queue.update(item.id, {
                status: 'completed',
                last_error: null,
                updated_at: new Date().toISOString(),
            });
            sent++;
        } catch (err) {
            const errorMsg = err.response?.data?.message
                || err.response?.statusText
                || err.message
                || 'Erro desconhecido';
            const kind = classifyError(err);

            if (kind === 'auth') {
                // Sessão expirada: item volta a 'pending' e a rodada é abortada —
                // retentar os demais só geraria a mesma falha.
                await db.sync_queue.update(item.id, {
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                });
                aborted = true;
                onProgress?.(100, 'Sessão expirada — faça login novamente para sincronizar.');
                break;
            }

            if (kind === 'permanent') {
                // Servidor recusou (ex.: 422). Reenviar o mesmo payload não
                // resolve — sai da fila automática e vai para triagem manual.
                await db.sync_queue.update(item.id, {
                    status: 'rejected',
                    attempts: (item.attempts || 0) + 1,
                    last_error: errorMsg,
                    updated_at: new Date().toISOString(),
                });
                await markRecordRejected(item, errorMsg);
                rejected++;
            } else {
                await db.sync_queue.update(item.id, {
                    status: 'failed',
                    attempts: (item.attempts || 0) + 1,
                    last_error: errorMsg,
                    updated_at: new Date().toISOString(),
                });
                failed++;
            }
            console.warn('[syncQueue] falhou:', item.table, item.op, kind, errorMsg);
        }
    }

    if (!aborted) {
        const partes = [`${sent} enviado(s)`];
        if (failed) partes.push(`${failed} falha(s) temporária(s)`);
        if (rejected) partes.push(`${rejected} rejeitado(s) pelo servidor`);
        onProgress?.(100, `Sincronizado: ${partes.join(', ')}.`);
    }

    // GC dos completados antigos
    await clearCompleted(24);

    return { sent, failed, rejected, total, aborted };
}

// -----------------------------------------------------------------------------
// Triagem manual dos rejeitados (erro permanente do servidor)
// -----------------------------------------------------------------------------
export async function listRejected() {
    return await db.sync_queue.where('status').equals('rejected').sortBy('created_at');
}

export async function countRejected() {
    return await db.sync_queue.where('status').equals('rejected').count();
}

// "Tentar novamente": devolve o item à fila. Útil quando a causa foi resolvida
// (ex.: 422 de ciclo aberto em outro veículo, depois que o ciclo foi fechado).
export async function retryRejected(queueId) {
    const item = await db.sync_queue.get(queueId);
    if (!item || item.status !== 'rejected') return false;
    await db.sync_queue.update(queueId, {
        status: 'pending',
        last_error: null,
        updated_at: new Date().toISOString(),
    });
    const key = item.op === 'create' ? item.local_id : item.server_id;
    if (key != null) {
        try {
            await db.table(item.table).update(key, {
                _sync_status: item.op === 'create' ? 'pending_create'
                    : item.op === 'update' ? 'pending_update' : 'pending_delete',
                _sync_error: null,
            });
        } catch { /* registro pode ter sido removido */ }
    }
    return true;
}

// "Descartar": abandona a mutação rejeitada.
//   create  → remove o registro local (nunca existiu no servidor)
//   update  → restaura o local para 'synced' (o servidor mantém a versão antiga)
//   delete  → restaura o local para 'synced' (o registro continua existindo)
export async function discardRejected(queueId) {
    const item = await db.sync_queue.get(queueId);
    if (!item || item.status !== 'rejected') return false;
    try {
        if (item.op === 'create' && item.local_id) {
            await db.table(item.table).delete(item.local_id);
        } else if (item.server_id != null) {
            await db.table(item.table).update(item.server_id, {
                _sync_status: 'synced',
                _sync_error: null,
            });
        }
    } catch (e) {
        console.warn('[syncQueue] discardRejected:', e?.message);
    }
    await db.sync_queue.delete(queueId);
    return true;
}

// -----------------------------------------------------------------------------
// onSyncSuccess: atualiza o registro local após enviar com sucesso.
// Trata os 3 casos: create (substitui local_id pelo id real),
// update (limpa _sync_status), delete (remove registro local).
// -----------------------------------------------------------------------------
async function onSyncSuccess(queueItem, serverData) {
    const tableName = queueItem.table;
    const tbl = db.table(tableName);

    if (queueItem.op === 'create' && queueItem.local_id) {
        // Acha o registro local pelo _local_id e substitui pelo retornado do servidor
        const local = await tbl.where('_local_id').equals(queueItem.local_id).first();
        if (local) {
            await tbl.delete(local.id ?? local._local_id);
        }
        if (serverData?.id) {
            await tbl.put({
                ...serverData,
                _sync_status: 'synced',
                _local_id: null,
            });
        }
    } else if (queueItem.op === 'update' && queueItem.server_id) {
        if (serverData?.id) {
            await tbl.put({
                ...serverData,
                _sync_status: 'synced',
                _local_id: null,
            });
        } else {
            await tbl.update(queueItem.server_id, { _sync_status: 'synced' });
        }
    } else if (queueItem.op === 'delete' && queueItem.server_id) {
        await tbl.delete(queueItem.server_id);
    }
}

// -----------------------------------------------------------------------------
// Helper de alto nível usado pelos repositories: salva localmente + enqueue
// -----------------------------------------------------------------------------
export async function localCreate(tableName, payload, endpoint) {
    const localId = newLocalId(tableName);
    const now = new Date().toISOString();
    // Idempotência: o servidor deduplica creates reenviados pelo client_uuid.
    // Usamos o próprio localId (UUID) — vincula fila ↔ registro local ↔ servidor.
    const payloadComUuid = { ...payload, client_uuid: localId };
    const record = {
        ...payloadComUuid,
        id: localId,             // usa local_id como id provisório (string)
        _local_id: localId,
        _sync_status: 'pending_create',
        _updated_at: now,
        created_at: now,
        updated_at: now,
    };
    await db.table(tableName).put(record);
    await enqueue({
        table: tableName,
        op: 'create',
        payload: payloadComUuid,
        endpoint,
        local_id: localId,
    });
    return record;
}

// Um registro é "local-only" quando ainda não tem id do servidor (o id é o
// próprio _local_id, string). Para esses registros NUNCA se enfileira
// update/delete — o servidor não conhece esse id (geraria PUT/DELETE 404).
function isLocalOnly(record) {
    return !!record?._local_id && String(record.id) === String(record._local_id);
}

// Payload "limpo" a partir do registro local (sem campos de controle _*)
function payloadFromRecord(record) {
    const out = {};
    for (const [k, v] of Object.entries(record || {})) {
        if (k === 'id' || k.startsWith('_')) continue;
        out[k] = v;
    }
    return out;
}

export async function localUpdate(tableName, id, payload, endpoint) {
    const now = new Date().toISOString();
    const existing = await db.table(tableName).get(id);
    const localOnly = isLocalOnly(existing);

    const merged = {
        ...(existing || {}),
        ...payload,
        id,
        _sync_status: localOnly ? 'pending_create' : 'pending_update',
        _sync_error: null,
        _updated_at: now,
        updated_at: now,
    };
    await db.table(tableName).put(merged);

    if (localOnly) {
        // Ainda não existe no servidor: funde as mudanças no CREATE da fila.
        // Vale para pending, failed E rejected — editar um registro rejeitado
        // (ex.: 422 de validação) dá nova chance ao create corrigido.
        // (Antes, um update sobre create rejeitado virava PUT com id local → 404.)
        const createItem = await db.sync_queue
            .where('local_id').equals(id)
            .and(q => q.op === 'create' && q.status !== 'completed')
            .first();
        if (createItem) {
            await db.sync_queue.update(createItem.id, {
                payload: { ...createItem.payload, ...payload },
                status: 'pending',
                last_error: null,
                sw_processed: false,
                updated_at: now,
            });
        } else {
            // CREATE sumiu da fila (ex.: descartado na triagem): re-enfileira
            // um create completo a partir do registro local consolidado.
            await enqueue({
                table: tableName,
                op: 'create',
                payload: payloadFromRecord(merged),
                endpoint: endpoint.replace(/\/[^/]+$/, ''), // tira o /{id} do endpoint de update
                local_id: id,
            });
        }
        registerBackgroundSync();
        return merged;
    }

    await enqueue({
        table: tableName,
        op: 'update',
        payload,
        endpoint,
        server_id: id,
    });
    return merged;
}

export async function localDelete(tableName, id, endpoint) {
    const existing = await db.table(tableName).get(id);

    // Se nunca foi enviado ao servidor (local-only, inclui create rejeitado):
    // apenas remove local + cancela os itens da fila. NUNCA enfileira DELETE
    // com id local (o servidor não conhece esse id).
    if (isLocalOnly(existing)) {
        await db.table(tableName).delete(id);
        const queued = await db.sync_queue
            .where('local_id').equals(id)
            .and(q => q.status !== 'completed')
            .toArray();
        for (const q of queued) {
            await db.sync_queue.delete(q.id);
        }
        return true;
    }

    // Caso normal: marca como pending_delete e enfileira
    await db.table(tableName).update(id, {
        _sync_status: 'pending_delete',
        _updated_at: new Date().toISOString(),
    });
    await enqueue({
        table: tableName,
        op: 'delete',
        payload: {},
        endpoint,
        server_id: id,
    });
    return true;
}

export default {
    enqueue,
    processAll,
    countPending,
    listPending,
    listRejected,
    countRejected,
    retryRejected,
    discardRejected,
    classifyError,
    clearCompleted,
    removeItem,
    localCreate,
    localUpdate,
    localDelete,
    registerBackgroundSync,
    reconcileSwResults,
};
