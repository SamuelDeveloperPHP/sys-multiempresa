// resources/js/offline/repositories/checklistsRepo.js
// -----------------------------------------------------------------------------
// Sync read-only de templates de checklist (checklists + checklist_itens) e
// CRUD offline-first das execuções (checklist_servicos).
//
// Modelo: cada checklist_servico armazena o template usado + um JSON de respostas
// (respostas: [{item_id, ok: bool, observacao, foto_base64?}]).
// Isso simplifica drasticamente a sincronização — sem N:N pendings.
// -----------------------------------------------------------------------------

import db, { setLastSync } from '../db';
import apiClient from '../api/client';
import ENDPOINTS from '../api/endpoints';
import { localCreate, localUpdate, localDelete } from '../syncQueue';

// -----------------------------------------------------------------------------
// TEMPLATES — listagem POR VEÍCULO (checklist é por veículo)
// -----------------------------------------------------------------------------
export async function syncChecklists(veiculoId = null) {
    const url = veiculoId ? ENDPOINTS.checklists.byVeiculo(veiculoId) : ENDPOINTS.checklists.list;
    const { data } = await apiClient.get(url);
    const checklists = (data?.checklists || data?.data || []).map(checklist => {
        const rawVehicleId = checklist.veiculo_id ?? checklist.id_veiculo ?? veiculoId;
        return {
            ...checklist,
            ...(rawVehicleId == null ? {} : { veiculo_id: Number(rawVehicleId) }),
        };
    });
    const itens = (data?.itens || data?.checklist_itens || []).map(item => ({
        ...item,
        checklist_id: Number(item.checklist_id ?? item.id_checklist),
    }));

    await db.transaction('rw', [db.checklists, db.checklist_itens], async () => {
        if (!veiculoId) {
            // Global sync is additive: do not remove local templates while other
            // screens may be reading them or while an offline workflow is active.
            if (checklists.length) await db.checklists.bulkPut(checklists);
            if (itens.length) await db.checklist_itens.bulkPut(itens);
            return;
        }

        // Remove os antigos desse veículo (checklists e itens vinculados)
        const existing = await db.checklists.where('veiculo_id').equals(Number(veiculoId)).toArray();
        const oldIds = existing.map(c => c.id);
        if (oldIds.length) {
            await db.checklist_itens.where('checklist_id').anyOf(oldIds).delete();
        }
        await db.checklists.where('veiculo_id').equals(Number(veiculoId)).delete();

        if (checklists.length) await db.checklists.bulkPut(checklists);
        if (itens.length) await db.checklist_itens.bulkPut(itens);
    });
    await setLastSync(`checklists:veiculo:${veiculoId}`);
    return checklists.length;
}

export async function listChecklists(veiculoId = null) {
    if (veiculoId) {
        return await db.checklists.where('veiculo_id').equals(Number(veiculoId)).toArray();
    }
    return await db.checklists.toArray();
}

export async function findChecklist(id) {
    const checklist = await db.checklists.get(Number(id));
    if (!checklist) return null;
    const itens = await db.checklist_itens
        .where('checklist_id').equals(Number(id))
        .toArray();
    return { ...checklist, itens };
}

// -----------------------------------------------------------------------------
// EXECUÇÕES — CRUD com queue
// -----------------------------------------------------------------------------
export async function syncServicosByVeiculo(veiculoId) {
    const { data } = await apiClient.get(ENDPOINTS.checklistServicos.byVeiculo(veiculoId));
    const rows = (data?.data || data?.servicos || []).map(r => ({
        ...r, veiculo_id: Number(r.veiculo_id ?? r.id_veiculo ?? veiculoId),
        _sync_status: 'synced', _local_id: null,
    }));
    await db.transaction('rw', db.checklist_servicos, async () => {
        await db.checklist_servicos
            .where('veiculo_id').equals(Number(veiculoId))
            .and(r => r._sync_status === 'synced')
            .delete();
        if (rows.length) await db.checklist_servicos.bulkPut(rows);
    });
    await setLastSync(`checklist_servicos:veiculo:${veiculoId}`);
    return rows.length;
}

export async function listServicosByVeiculo(veiculoId) {
    return await db.checklist_servicos
        .where('veiculo_id').equals(Number(veiculoId))
        .reverse()
        .sortBy('data');
}

export async function findServico(id) {
    return await db.checklist_servicos.get(id) || await db.checklist_servicos.get(Number(id));
}

export async function createServico(payload) {
    return await localCreate('checklist_servicos', payload, ENDPOINTS.checklistServicos.create);
}
export async function updateServico(id, payload) {
    return await localUpdate('checklist_servicos', id, payload, ENDPOINTS.checklistServicos.update(id));
}
export async function removeServico(id) {
    return await localDelete('checklist_servicos', id, ENDPOINTS.checklistServicos.delete(id));
}

// -----------------------------------------------------------------------------
// LISTA GLOBAL: todas as execuções de checklist do cache local
// -----------------------------------------------------------------------------
export async function listAllRecentServicos(limit = 100) {
    const all = await db.checklist_servicos.reverse().sortBy('data');
    return all.slice(0, limit);
}

export async function syncAllRecentServicos() {
    const { data } = await apiClient.get(ENDPOINTS.checklistServicos.list);
    const rows = (data?.data || data?.servicos || []).map(r => ({
        ...r, veiculo_id: Number(r.veiculo_id ?? r.id_veiculo),
        _sync_status: 'synced', _local_id: null,
    }));
    await db.transaction('rw', db.checklist_servicos, async () => {
        await db.checklist_servicos.filter(r => r._sync_status === 'synced').delete();
        if (rows.length) await db.checklist_servicos.bulkPut(rows);
    });
    await setLastSync('checklist_servicos:all');
    return rows.length;
}

// -----------------------------------------------------------------------------
// LIMPAR CACHE do módulo (botão "Limpar cache" da página): remove execuções
// JÁ SINCRONIZADAS + templates/itens do veículo (catálogo re-sincronizável).
// Pendências de envio ficam intactas.
// -----------------------------------------------------------------------------
export async function clearSyncedByVeiculo(veiculoId) {
    const vid = Number(veiculoId);
    await db.transaction('rw', [db.checklist_servicos, db.checklists, db.checklist_itens], async () => {
        await db.checklist_servicos
            .where('veiculo_id').equals(vid)
            .and(r => r._sync_status === 'synced')
            .delete();
        const tplIds = (await db.checklists.where('veiculo_id').equals(vid).toArray()).map(c => c.id);
        if (tplIds.length) {
            await db.checklist_itens.where('checklist_id').anyOf(tplIds).delete();
        }
        await db.checklists.where('veiculo_id').equals(vid).delete();
    });
}

export default {
    syncChecklists,
    listChecklists,
    findChecklist,
    syncServicosByVeiculo,
    listServicosByVeiculo,
    findServico,
    createServico,
    updateServico,
    removeServico,
    listAllRecentServicos,
    syncAllRecentServicos,
    clearSyncedByVeiculo,
};
