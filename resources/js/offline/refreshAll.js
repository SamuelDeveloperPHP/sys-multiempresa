// resources/js/offline/refreshAll.js
// -----------------------------------------------------------------------------
// Pull GLOBAL: baixa os dados atualizados do servidor para o cache local
// (Dexie). Usado pelo botão "Sincronizar" do drawer, DEPOIS do envio (push)
// da fila — assim o botão sempre faz algo útil, mesmo sem pendências.
//
// Resiliente: cada módulo é independente (try/catch por etapa) — se um falhar,
// os demais seguem. Reporta progresso por etapa via onProgress(percent, msg).
//
// Ordem: Veículos primeiro (base referenciada pelos demais na exibição),
// depois os módulos operacionais. Só puxa o conjunto que as telas de lista já
// atualizam (recentes cross-veículo) + veículos + templates de checklist.
// -----------------------------------------------------------------------------

import { syncFromServer as pullVeiculos } from './repositories/veiculosRepo';
import { syncAllRecent as pullAbastecimentos } from './repositories/abastecimentosRepo';
import { syncAllRecent as pullDiario } from './repositories/diarioBordoRepo';
import { syncChecklists, syncAllRecentServicos } from './repositories/checklistsRepo';
import { syncAllRecent as pullLocacoes } from './repositories/locacoesRepo';

export async function refreshAll(onProgress = null) {
    const etapas = [
        ['Veículos', pullVeiculos],
        ['Abastecimentos', pullAbastecimentos],
        ['Diário de Bordo', pullDiario],
        ['Checklists', syncChecklists],
        ['Checklists (histórico)', syncAllRecentServicos],
        ['Locações', pullLocacoes],
    ];

    let ok = 0;
    let fail = 0;
    for (let i = 0; i < etapas.length; i++) {
        const [label, fn] = etapas[i];
        if (onProgress) onProgress(Math.round((i / etapas.length) * 100), `Baixando ${label}…`);
        try {
            await fn();
            ok++;
        } catch (e) {
            fail++;
            if (typeof console !== 'undefined') {
                console.warn(`[refreshAll] ${label} falhou:`, e?.message);
            }
        }
    }
    if (onProgress) onProgress(100, 'Atualizado');
    return { ok, fail, total: etapas.length };
}

export default refreshAll;
