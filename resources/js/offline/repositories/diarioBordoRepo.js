// resources/js/offline/repositories/diarioBordoRepo.js
import db, { setLastSync } from '../db';
import apiClient from '../api/client';
import ENDPOINTS from '../api/endpoints';
import { localCreate, localUpdate, localDelete } from '../syncQueue';

export async function syncByVeiculo(veiculoId) {
    const { data } = await apiClient.get(ENDPOINTS.diarioBordo.byVeiculo(veiculoId));
    const rows = (data?.data || data?.diario_bordo || []).map(r => ({
        ...r, _sync_status: 'synced', _local_id: null,
    }));
    await db.transaction('rw', db.diario_bordo, async () => {
        await db.diario_bordo
            .where('veiculo_id').equals(Number(veiculoId))
            .and(r => r._sync_status === 'synced')
            .delete();
        if (rows.length) await db.diario_bordo.bulkPut(rows);
    });
    await setLastSync(`diario:veiculo:${veiculoId}`);
    return rows.length;
}

export async function listByVeiculo(veiculoId) {
    return await db.diario_bordo
        .where('veiculo_id').equals(Number(veiculoId))
        .reverse()
        .sortBy('data');
}

export async function find(id) {
    return await db.diario_bordo.get(id) || await db.diario_bordo.get(Number(id));
}

// -----------------------------------------------------------------------------
// CICLOS ABERTOS - regra do legado: 1 diário ABERTO por motorista
// -----------------------------------------------------------------------------

/**
 * Retorna o diário ABERTO do motorista, ou null.
 * Procura na base local. Considera apenas registros não-deletados.
 *
 * @param {number} userId - id do motorista (auth.user.id)
 * @returns {Promise<Object|null>}
 */
export async function findOpen(userId = null) {
    let query = db.diario_bordo.where('ciclo_status').equals('ABERTO');
    if (userId) {
        query = query.and(r => Number(r.user_id) === Number(userId));
    }
    // Exclui registros marcados para delete
    query = query.and(r => r._sync_status !== 'pending_delete');
    const all = await query.toArray();
    return all[0] || null;
}

/**
 * Lista todos os diários ABERTOS (debug/admin).
 */
export async function listOpen() {
    return await db.diario_bordo
        .where('ciclo_status').equals('ABERTO')
        .and(r => r._sync_status !== 'pending_delete')
        .toArray();
}

export async function create(payload) {
    return await localCreate('diario_bordo', payload, ENDPOINTS.diarioBordo.create);
}
export async function update(id, payload) {
    return await localUpdate('diario_bordo', id, payload, ENDPOINTS.diarioBordo.update(id));
}
export async function remove(id) {
    return await localDelete('diario_bordo', id, ENDPOINTS.diarioBordo.delete(id));
}

export async function listAllRecent(limit = 100) {
    const all = await db.diario_bordo.reverse().sortBy('data');
    return all.slice(0, limit);
}

export async function syncAllRecent() {
    const { data } = await apiClient.get(ENDPOINTS.diarioBordo.list);
    const rows = (data?.data || data?.diario_bordo || []).map(r => ({
        ...r, _sync_status: 'synced', _local_id: null,
    }));
    await db.transaction('rw', db.diario_bordo, async () => {
        await db.diario_bordo.filter(r => r._sync_status === 'synced').delete();
        if (rows.length) await db.diario_bordo.bulkPut(rows);
    });
    await setLastSync('diario:all');
    return rows.length;
}

// -----------------------------------------------------------------------------
// LIMPAR CACHE do módulo (botão "Limpar cache" da página): remove apenas os
// registros JÁ SINCRONIZADOS do veículo — pendências de envio ficam intactas.
// -----------------------------------------------------------------------------
export async function clearSyncedByVeiculo(veiculoId) {
    return await db.diario_bordo
        .where('veiculo_id').equals(Number(veiculoId))
        .and(r => r._sync_status === 'synced')
        .delete();
}

export default { syncByVeiculo, listByVeiculo, find, findOpen, listOpen, create, update, remove, listAllRecent, syncAllRecent, clearSyncedByVeiculo };
