// resources/js/offline/hooks/useSyncStatus.js
// -----------------------------------------------------------------------------
// Hook que expõe o estado da fila de sincronização (sync_queue):
//   - pendingCount       : nº de itens com status pending|failed
//   - failedCount        : nº de itens com status failed
//   - lastSyncAt         : ISO da última sincronização global
//   - syncing            : true durante processAll
//   - progress           : { percent, message }
//   - sync()             : função para acionar processAll manualmente
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { getMeta, setMeta } from '../db';
import { processAll } from '../syncQueue';

export default function useSyncStatus() {
    // Contagem reativa via useLiveQuery — re-renderiza quando a tabela muda
    const pendingCount = useLiveQuery(
        () => db.sync_queue.where('status').anyOf(['pending', 'failed']).count(),
        [],
        0
    );

    const failedCount = useLiveQuery(
        () => db.sync_queue.where('status').equals('failed').count(),
        [],
        0
    );

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
        pendingCount: pendingCount || 0,
        failedCount: failedCount || 0,
        lastSyncAt: lastSyncMeta?.value || null,
        syncing,
        progress,
        lastResult,
        sync,
    };
}
