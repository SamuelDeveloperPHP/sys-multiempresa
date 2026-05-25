// resources/js/offline/hooks/useOpenCycles.js
// -----------------------------------------------------------------------------
// Hook que monitora "ciclos abertos" (diário de bordo + checklist em status
// ABERTO) do motorista logado. Usado para BLOQUEAR abertura de novo ciclo
// em outro veículo enquanto existir um aberto.
//
// Regra do legado: motorista só pode ter 1 ciclo aberto por vez. Para abrir em
// outro veículo, precisa fechar o anterior.
//
// useLiveQuery do Dexie torna o hook reativo — re-renderiza automaticamente
// quando algum registro de ciclo é criado/fechado.
//
// Retorno:
//   {
//     openDiario:    null | { id, veiculo_id, prefixo, ... },
//     openChecklist: null | { id, veiculo_id, prefixo, tipo, ... },
//     hasOpen:       boolean,
//     hasOpenInOtherVehicle: (veiculoId) => boolean
//   }
// -----------------------------------------------------------------------------

import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';

export default function useOpenCycles(userId = null) {
    // Diário aberto
    const openDiario = useLiveQuery(async () => {
        let q = db.diario_bordo.where('ciclo_status').equals('ABERTO');
        if (userId) {
            q = q.and(r => Number(r.user_id) === Number(userId));
        }
        q = q.and(r => r._sync_status !== 'pending_delete');
        const arr = await q.toArray();
        const first = arr[0] || null;
        if (!first) return null;
        // Enriquece com prefixo do veículo se possível
        const veiculo = await db.veiculos.get(Number(first.veiculo_id));
        return { ...first, prefixo: veiculo?.prefixo || `Veículo #${first.veiculo_id}` };
    }, [userId], null);

    // Checklist aberto
    const openChecklist = useLiveQuery(async () => {
        let q = db.checklist_servicos.where('ciclo_status').equals('ABERTO');
        if (userId) {
            q = q.and(r => Number(r.user_id) === Number(userId));
        }
        q = q.and(r => r._sync_status !== 'pending_delete');
        const arr = await q.toArray();
        const first = arr[0] || null;
        if (!first) return null;
        const veiculo = await db.veiculos.get(Number(first.veiculo_id));
        return { ...first, prefixo: veiculo?.prefixo || `Veículo #${first.veiculo_id}` };
    }, [userId], null);

    const hasOpen = !!(openDiario || openChecklist);

    const hasOpenInOtherVehicle = (veiculoId) => {
        const vid = Number(veiculoId);
        if (openDiario && Number(openDiario.veiculo_id) !== vid) return true;
        if (openChecklist && Number(openChecklist.veiculo_id) !== vid) return true;
        return false;
    };

    const getOpenInOtherVehicle = (veiculoId) => {
        const vid = Number(veiculoId);
        const blockers = [];
        if (openDiario && Number(openDiario.veiculo_id) !== vid) {
            blockers.push({ kind: 'diario', ...openDiario });
        }
        if (openChecklist && Number(openChecklist.veiculo_id) !== vid) {
            blockers.push({ kind: 'checklist', ...openChecklist });
        }
        return blockers;
    };

    return {
        openDiario,
        openChecklist,
        hasOpen,
        hasOpenInOtherVehicle,
        getOpenInOtherVehicle,
    };
}
