// resources/js/Components/Mobile/SyncButton.jsx
// -----------------------------------------------------------------------------
// Botão "Sincronizar agora" que mostra:
//   - badge com nº de itens pendentes
//   - ícone girando enquanto sincroniza
//   - barra de progresso (durante sync)
//   - toast de resultado ao final
// -----------------------------------------------------------------------------

import { useState } from 'react';
import useSyncStatus from '@/offline/hooks/useSyncStatus';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function SyncButton({ compact = false }) {
    const { pendingCount, failedCount, syncing, progress, lastResult, sync, lastSyncAt } = useSyncStatus();
    const { online } = useOnlineStatus();
    const [showResult, setShowResult] = useState(false);

    const handleSync = async () => {
        if (!online) {
            alert('Você está offline. Conecte-se à internet para sincronizar.');
            return;
        }
        if (pendingCount === 0) {
            alert('Nada para sincronizar.');
            return;
        }
        const res = await sync();
        if (res) {
            setShowResult(true);
            setTimeout(() => setShowResult(false), 4000);
        }
    };

    const hasPending = pendingCount > 0;
    const hasFailed = failedCount > 0;

    const buttonColor = !online
        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
        : hasFailed
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : hasPending
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white';

    if (compact) {
        return (
            <button
                onClick={handleSync}
                disabled={syncing || !online}
                title={
                    syncing ? 'Sincronizando…' :
                    !online ? 'Você está offline' :
                    hasPending ? `${pendingCount} item(ns) pendente(s)` :
                    'Tudo sincronizado'
                }
                className={`relative p-2 rounded-full transition-colors ${buttonColor}`}
            >
                <i className={`fa-solid fa-cloud-arrow-up text-sm ${syncing ? 'animate-pulse' : ''}`} />
                {hasPending && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-1 w-full">
            <button
                onClick={handleSync}
                disabled={syncing || !online}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${buttonColor}`}
            >
                {syncing ? (
                    <>
                        <i className="fa-solid fa-spinner animate-spin" />
                        <span>Sincronizando… {progress.percent}%</span>
                    </>
                ) : (
                    <>
                        <i className="fa-solid fa-cloud-arrow-up" />
                        <span>
                            {hasPending ? `Sincronizar (${pendingCount})` : 'Tudo sincronizado'}
                        </span>
                    </>
                )}
            </button>

            {syncing && progress.message && (
                <div className="text-[11px] text-gray-500 text-center">{progress.message}</div>
            )}

            {showResult && lastResult && !syncing && (
                <div className={`text-[11px] text-center px-2 py-1 rounded ${
                    lastResult.failed > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                    {lastResult.sent} enviado(s){lastResult.failed > 0 ? `, ${lastResult.failed} falharam` : ''}
                </div>
            )}

            {!syncing && lastSyncAt && (
                <div className="text-[10px] text-gray-400 text-center">
                    Última sinc: {new Date(lastSyncAt).toLocaleString('pt-BR')}
                </div>
            )}
        </div>
    );
}
