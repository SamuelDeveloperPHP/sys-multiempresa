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

export default { syncByVeiculo, listByVeiculo, find, create, update, remove, listAllRecent, syncAllRecent };
