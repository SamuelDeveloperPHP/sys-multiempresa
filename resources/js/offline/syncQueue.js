// resources/js/offline/syncQueue.js
// -----------------------------------------------------------------------------
// Fila de mutações offline. Cada chamada CRUD do repository registra um item
// aqui. Quando o usuário clica "Sincronizar agora" (botão manual), processAll()
// despacha cada item para o endpoint correspondente.
//
// status:
//   'pending'   — aguardando envio
//   'sending'   — em transmissão
//   'failed'    — falhou (com attempts++ e last_error)
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
    return id;
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
// processAll — dispara o envio da fila. Chamado pelo botão "Sincronizar agora".
// onProgress(percent, message) é opcional. Retorna { sent, failed, total }.
// -----------------------------------------------------------------------------
export async function processAll(onProgress = null) {
    const items = await listPending();
    const total = items.length;
    let sent = 0;
    let failed = 0;

    if (total === 0) {
        onProgress?.(100, 'Nada a sincronizar.');
        return { sent: 0, failed: 0, total: 0 };
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        onProgress?.(Math.round((i / total) * 100), `Enviando ${item.table}…`);

        await db.sync_queue.update(item.id, { status: 'sending', updated_at: new Date().toISOString() });

        try {
            const method = HTTP_METHOD[item.op];
            const url = item.endpoint;
            let response;

            if (method === 'POST') {
                response = await apiClient.post(url, item.payload);
            } else if (method === 'PUT') {
                response = await apiClient.put(url, item.payload);
            } else if (method === 'DELETE') {
                response = await apiClient.delete(url);
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

            await db.sync_queue.update(item.id, {
                status: 'failed',
                attempts: (item.attempts || 0) + 1,
                last_error: errorMsg,
                updated_at: new Date().toISOString(),
            });
            failed++;
            console.warn('[syncQueue] falhou:', item.table, item.op, errorMsg);
        }
    }

    onProgress?.(100, `Sincronizado: ${sent} enviados, ${failed} falharam.`);

    // GC dos completados antigos
    await clearCompleted(24);

    return { sent, failed, total };
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
    const record = {
        ...payload,
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
        payload,
        endpoint,
        local_id: localId,
    });
    return record;
}

export async function localUpdate(tableName, id, payload, endpoint) {
    const now = new Date().toISOString();
    const existing = await db.table(tableName).get(id);
    const merged = {
        ...(existing || {}),
        ...payload,
        id,
        _sync_status: existing?._sync_status === 'pending_create' ? 'pending_create' : 'pending_update',
        _updated_at: now,
        updated_at: now,
    };
    await db.table(tableName).put(merged);

    // Se ainda nem foi criado no servidor, atualiza o payload do create na fila
    if (existing?._sync_status === 'pending_create') {
        const createItem = await db.sync_queue
            .where('local_id').equals(id)
            .and(q => q.op === 'create' && q.status !== 'completed')
            .first();
        if (createItem) {
            await db.sync_queue.update(createItem.id, {
                payload: { ...createItem.payload, ...payload },
                updated_at: now,
            });
            return merged;
        }
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

    // Se nunca foi enviado ao servidor (pending_create), apenas remove local + cancela enqueue
    if (existing?._sync_status === 'pending_create') {
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
    clearCompleted,
    removeItem,
    localCreate,
    localUpdate,
    localDelete,
};
