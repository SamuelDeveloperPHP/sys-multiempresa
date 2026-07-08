// resources/js/offline/hooks/useOpenCycles.js
// -----------------------------------------------------------------------------
// Hook que monitora o DIÁRIO DE BORDO em status ABERTO do motorista logado.
// Usado para BLOQUEAR abertura de novo diário em outro veículo enquanto
// existir um aberto (regra: motorista só pode ter 1 diário aberto por vez).
//
// HISTÓRICO: até 2026-07-08 o CHECKLIST também tinha ciclo (abertura/
// encerramento) e era monitorado aqui. Por decisão da gerência, checklist
// virou cadastro único (com intervalo mínimo de 1h) e saiu deste hook.
//
// useLiveQuery do Dexie torna o hook reativo — re-renderiza automaticamente
// quando algum diário é criado/fechado.
//
// Retorno:
//   {
//     openDiario:    null | { id, veiculo_id, prefixo, ... },
//     hasOpen:       boolean,
//     hasOpenInOtherVehicle: (veiculoId) => boolean,
//     getOpenInOtherVehicle: (veiculoId) => array,
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

    const hasOpen = !!openDiario;

    const hasOpenInOtherVehicle = (veiculoId) => {
        const vid = Number(veiculoId);
        return !!(openDiario && Number(openDiario.veiculo_id) !== vid);
    };

    const getOpenInOtherVehicle = (veiculoId) => {
        const vid = Number(veiculoId);
        if (openDiario && Number(openDiario.veiculo_id) !== vid) {
            return [{ kind: 'diario', ...openDiario }];
        }
        return [];
    };

    return {
        openDiario,
        hasOpen,
        hasOpenInOtherVehicle,
        getOpenInOtherVehicle,
    };
}
