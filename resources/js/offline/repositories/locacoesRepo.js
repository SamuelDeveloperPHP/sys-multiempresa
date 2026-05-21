// resources/js/offline/repositories/locacoesRepo.js
// Locações: read-only no mobile (cadastro fica no admin web).
import db, { setLastSync } from '../db';
import apiClient from '../api/client';
import ENDPOINTS from '../api/endpoints';

export async function syncByVeiculo(veiculoId) {
    const { data } = await apiClient.get(ENDPOINTS.locacoes.byVeiculo(veiculoId));
    const rows = data?.data || data?.locacoes || [];
    await db.transaction('rw', db.locacoes, async () => {
        await db.locacoes.where('veiculo_id').equals(Number(veiculoId)).delete();
        if (rows.length) await db.locacoes.bulkPut(rows);
    });
    await setLastSync(`locacoes:veiculo:${veiculoId}`);
    return rows.length;
}

export async function listByVeiculo(veiculoId) {
    return await db.locacoes
        .where('veiculo_id').equals(Number(veiculoId))
        .reverse()
        .sortBy('id');
}

export async function listAll() {
    return await db.locacoes.toArray();
}

export async function syncAllRecent() {
    const { data } = await apiClient.get(ENDPOINTS.locacoes.list);
    const rows = data?.data || data?.locacoes || [];
    await db.transaction('rw', db.locacoes, async () => {
        await db.locacoes.clear();
        if (rows.length) await db.locacoes.bulkPut(rows);
    });
    await setLastSync('locacoes:all');
    return rows.length;
}

export default { syncByVeiculo, listByVeiculo, listAll, syncAllRecent };
