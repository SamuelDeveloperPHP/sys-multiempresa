// resources/js/offline/repositories/abastecimentosRepo.js
// -----------------------------------------------------------------------------
// CRUD offline-first de Abastecimentos. Salva tudo localmente em IndexedDB
// e enfileira mutações em sync_queue para envio quando o usuário clicar
// "Sincronizar agora".
// -----------------------------------------------------------------------------

import db, { setLastSync } from '../db';
import apiClient from '../api/client';
import ENDPOINTS from '../api/endpoints';
import { localCreate, localUpdate, localDelete } from '../syncQueue';

// -----------------------------------------------------------------------------
// SYNC: baixa do servidor
// -----------------------------------------------------------------------------
export async function syncByVeiculo(veiculoId) {
    const { data } = await apiClient.get(ENDPOINTS.abastecimentos.byVeiculo(veiculoId));
    const rows = (data?.data || data?.abastecimentos || []).map(r => ({
        ...r,
        _sync_status: 'synced',
        _local_id: null,
    }));
    await db.transaction('rw', db.abastecimentos, async () => {
        // remove só os sincronizados desse veículo, mantém pendentes
        await db.abastecimentos
            .where('veiculo_id').equals(Number(veiculoId))
            .and(r => r._sync_status === 'synced')
            .delete();
        if (rows.length) {
            await db.abastecimentos.bulkPut(rows);
        }
    });
    await setLastSync(`abastecimentos:veiculo:${veiculoId}`);
    return rows.length;
}

// -----------------------------------------------------------------------------
// LIST: somente cache local
// -----------------------------------------------------------------------------
export async function listByVeiculo(veiculoId) {
    return await db.abastecimentos
        .where('veiculo_id').equals(Number(veiculoId))
        .reverse()
        .sortBy('data');
}

export async function find(id) {
    // id pode ser numérico (servidor) ou string (local_id)
    return await db.abastecimentos.get(id) || await db.abastecimentos.get(Number(id));
}

// -----------------------------------------------------------------------------
// CRUD com enqueue
// -----------------------------------------------------------------------------
export async function create(payload) {
    return await localCreate('abastecimentos', payload, ENDPOINTS.abastecimentos.create);
}

export async function update(id, payload) {
    return await localUpdate('abastecimentos', id, payload, ENDPOINTS.abastecimentos.update(id));
}

export async function remove(id) {
    return await localDelete('abastecimentos', id, ENDPOINTS.abastecimentos.delete(id));
}

// -----------------------------------------------------------------------------
// LISTA GLOBAL: todos os abastecimentos do cache local (cross-veículo)
// -----------------------------------------------------------------------------
export async function listAllRecent(limit = 100) {
    const all = await db.abastecimentos.reverse().sortBy('data');
    return all.slice(0, limit);
}

export async function syncAllRecent() {
    const { data } = await apiClient.get(ENDPOINTS.abastecimentos.list);
    const rows = (data?.data || data?.abastecimentos || []).map(r => ({
        ...r, _sync_status: 'synced', _local_id: null,
    }));
    await db.transaction('rw', db.abastecimentos, async () => {
        // Limpa só os synced (mantém pendentes)
        await db.abastecimentos.filter(r => r._sync_status === 'synced').delete();
        if (rows.length) await db.abastecimentos.bulkPut(rows);
    });
    await setLastSync('abastecimentos:all');
    return rows.length;
}

export default { syncByVeiculo, listByVeiculo, find, create, update, remove, listAllRecent, syncAllRecent };
