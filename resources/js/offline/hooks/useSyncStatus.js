// resources/js/offline/hooks/useSyncStatus.js
// -----------------------------------------------------------------------------
// Hook que expõe o estado da fila de sincronização (sync_queue):
//   - pendingCount       : nº de itens com status pending|failed
//   - failedCount        : nº de itens com status failed
//   - rejectedCount      : nº de itens rejeitados pelo servidor (erro permanente)
//   - rejectedItems      : itens rejeitados (para triagem manual na UI)
//   - lastSyncAt         : ISO da última sincronização global
//   - syncing            : true durante processAll
//   - progress           : { percent, message }
//   - sync()             : função para acionar processAll manualmente
//   - retryRejected(id)  : devolve item rejeitado à fila
//   - discardRejected(id): descarta item rejeitado (e ajusta o registro local)
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { getMeta, setMeta } from '../db';
import { processAll, retryRejected, discardRejected } from '../syncQueue';

export default function useSyncStatus() {
    // Contagem reativa via useLiveQuery — re-renderiza quando a tabela muda.
    // IMPORTANTE: sem defaultValue, o hook retorna `undefined` até a 1ª consulta
    // resolver. Isso deixa a UI distinguir "ainda carregando" de "zero pendências"
    // — sem isso, ao montar (ex.: abrir o drawer) o valor caía como 0 e a tela
    // afirmava "Tudo sincronizado" por um frame antes de saber a contagem real.
    const pendingRaw = useLiveQuery(
        () => db.sync_queue.where('status').anyOf(['pending', 'failed']).count(),
        []
    );

    const failedCount = useLiveQuery(
        () => db.sync_queue.where('status').equals('failed').count(),
        [],
        0
    );

    // Rejeitados pelo servidor (erro permanente) — fora da fila automática,
    // aguardando triagem manual do usuário.
    const rejectedRaw = useLiveQuery(
        () => db.sync_queue.where('status').equals('rejected').sortBy('created_at'),
        []
    );

    // Só afirmamos um estado de sincronização depois que AMBAS as consultas
    // resolveram. Enquanto `ready` é false, a UI mostra "Verificando…" em vez de
    // um "Tudo sincronizado" prematuro (a causa do sidebar sempre verde).
    const ready = pendingRaw !== undefined && rejectedRaw !== undefined;
    const pendingCount = pendingRaw ?? 0;
    const rejectedItems = rejectedRaw ?? [];

    const lastSyncMeta = useLiveQuery(
        () => db.meta.get('last_global_sync'),
        [],
        null
    );

    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState({ percent: 0, message: '' });
    const [lastResult, setLastResult] = useState(null);

    const sync = useCallback(async () => {
        if (syncing) return null;
        setSyncing(true);
        setProgress({ percent: 0, message: 'Iniciando…' });
        try {
            const result = await processAll((percent, message) => {
                setProgress({ percent, message });
            });
            await setMeta('last_global_sync', new Date().toISOString());
            setLastResult(result);
            return result;
        } catch (err) {
            console.error('[useSyncStatus] erro:', err);
            setLastResult({ sent: 0, failed: 0, total: 0, error: err.message });
            return null;
        } finally {
            setSyncing(false);
            // Reset progress após 2s
            setTimeout(() => setProgress({ percent: 0, message: '' }), 2000);
        }
    }, [syncing]);

    return {
        ready,
        pendingCount: pendingCount || 0,
        failedCount: failedCount || 0,
        rejectedCount: rejectedItems?.length || 0,
        rejectedItems: rejectedItems || [],
        lastSyncAt: lastSyncMeta?.value || null,
        syncing,
        progress,
        lastResult,
        sync,
        retryRejected,
        discardRejected,
    };
}
