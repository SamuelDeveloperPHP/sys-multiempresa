// resources/js/offline/db.js
// -----------------------------------------------------------------------------
// Banco offline (IndexedDB via Dexie) do módulo Mobile.
// Cada tabela "transacional" possui campos extras de controle:
//   _sync_status: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete'
//   _local_id   : UUID temporário enquanto o registro ainda não tem ID do servidor
//   _updated_at : timestamp local da última edição (para conflict resolution)
// -----------------------------------------------------------------------------

import Dexie from 'dexie';

export const db = new Dexie('sga_engeativos_offline');

// ---------- v1: schema inicial ----------
db.version(1).stores({
    // ===== Catálogos (read-only do servidor, atualizados via syncFromServer) =====
    veiculos:       'id, prefixo, placa, obra_id, [obra_id+prefixo]',
    fornecedores:   'id, nome',
    categorias:     'id, nome',
    obras:          'id, nome',
    preventivas_itens:    'id, periodo_maq_vei, veiculo_id',
    servicos_preventiva:  'id, veiculo_id',

    // ===== Transacionais (CRUD offline + queue) =====
    abastecimentos:       'id, _local_id, veiculo_id, data, _sync_status',
    diario_bordo:         'id, _local_id, veiculo_id, data, _sync_status',
    checklists:           'id, obra_id',
    checklist_itens:      'id, checklist_id',
    checklist_servicos:   'id, _local_id, checklist_id, veiculo_id, data, _sync_status',
    checklist_execucoes:  'id, _local_id, checklist_servico_id, _sync_status',
    locacoes:             'id, veiculo_id, status',

    // ===== Fila de mutações + meta =====
    sync_queue:     '++id, table, op, status, created_at, [status+created_at]',
    meta:           'key',
});

// ---------- v2: adiciona ciclo_status em diario_bordo e checklist_servicos ----------
// Regra do legado: motorista só pode ter 1 diário/checklist ABERTO por vez.
// ciclo_status: 'ABERTO' | 'FECHADO'
// Dexie migra automaticamente sem perder dados — apenas adiciona índices.
db.version(2).stores({
    diario_bordo:       'id, _local_id, veiculo_id, data, _sync_status, ciclo_status, user_id, [ciclo_status+user_id]',
    checklist_servicos: 'id, _local_id, checklist_id, veiculo_id, data, _sync_status, ciclo_status, tipo, user_id, [ciclo_status+user_id]',
});

// -----------------------------------------------------------------------------
// API utilitária para gerar IDs locais temporários
// -----------------------------------------------------------------------------
export function newLocalId(prefix = 'local') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// -----------------------------------------------------------------------------
// Helpers de meta (última sincronização por tabela, current user, etc.)
// -----------------------------------------------------------------------------
export async function setMeta(key, value) {
    await db.meta.put({ key, value, updated_at: new Date().toISOString() });
}

export async function getMeta(key, defaultValue = null) {
    const row = await db.meta.get(key);
    return row?.value ?? defaultValue;
}

export async function getLastSync(tableName) {
    return await getMeta(`last_sync:${tableName}`, null);
}

export async function setLastSync(tableName, isoDate = null) {
    await setMeta(`last_sync:${tableName}`, isoDate || new Date().toISOString());
}

// -----------------------------------------------------------------------------
// Limpa todos os dados locais (útil em logout)
// -----------------------------------------------------------------------------
export async function clearAllLocal() {
    const names = db.tables.map(t => t.name);
    await db.transaction('rw', names, async () => {
        for (const name of names) {
            await db.table(name).clear();
        }
    });
}

// Auto-abre o DB quando o módulo for importado.
db.open().catch(err => {
    console.error('[offline/db] falha ao abrir IndexedDB:', err);
});

export default db;
