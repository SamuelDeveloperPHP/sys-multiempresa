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

// Rótulos amigáveis das tabelas da fila
const TABLE_LABELS = {
    abastecimentos: 'Abastecimento',
    diario_bordo: 'Diário de Bordo',
    checklist_servicos: 'Checklist',
    checklist_execucoes: 'Checklist',
};

export default function SyncButton({ compact = false }) {
    const {
        pendingCount, failedCount, rejectedCount, rejectedItems,
        syncing, progress, lastResult, sync, lastSyncAt,
        retryRejected, discardRejected,
    } = useSyncStatus();
    const { online } = useOnlineStatus();
    const [showResult, setShowResult] = useState(false);
    const [showRejected, setShowRejected] = useState(false);

    const handleDiscard = async (item) => {
        const label = TABLE_LABELS[item.table] || item.table;
        if (window.confirm(`Descartar este registro de ${label}? Ele não será enviado ao servidor.`)) {
            await discardRejected(item.id);
        }
    };

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
    const hasRejected = rejectedCount > 0;

    const buttonColor = !online
        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
        : (hasFailed || hasRejected)
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
                    hasRejected ? `${rejectedCount} registro(s) rejeitado(s) — abra a sincronização` :
                    hasPending ? `${pendingCount} item(ns) pendente(s)` :
                    'Tudo sincronizado'
                }
                className={`relative p-2 rounded-full transition-colors ${buttonColor}`}
            >
                <i className={`fa-solid fa-cloud-arrow-up text-sm ${syncing ? 'animate-pulse' : ''}`} />
                {(hasPending || hasRejected) && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {(pendingCount + rejectedCount) > 99 ? '99+' : pendingCount + rejectedCount}
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
                    (lastResult.failed > 0 || lastResult.rejected > 0)
                        ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                    {lastResult.sent} enviado(s)
                    {lastResult.failed > 0 ? `, ${lastResult.failed} falharam` : ''}
                    {lastResult.rejected > 0 ? `, ${lastResult.rejected} rejeitado(s)` : ''}
                    {lastResult.aborted ? ' — sessão expirada' : ''}
                </div>
            )}

            {!syncing && lastSyncAt && (
                <div className="text-[10px] text-gray-400 text-center">
                    Última sinc: {new Date(lastSyncAt).toLocaleString('pt-BR')}
                </div>
            )}

            {/* Rejeitados pelo servidor (erro permanente): triagem manual */}
            {hasRejected && !syncing && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 space-y-2">
                    <button
                        type="button"
                        onClick={() => setShowRejected((v) => !v)}
                        className="w-full flex items-center justify-between text-[11px] font-semibold text-red-700"
                    >
                        <span>
                            <i className="fa-solid fa-circle-exclamation mr-1" />
                            {rejectedCount} registro(s) rejeitado(s) pelo servidor
                        </span>
                        <i className={`fa-solid fa-chevron-${showRejected ? 'up' : 'down'}`} />
                    </button>

                    {showRejected && rejectedItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-md border border-red-100 p-2">
                            <p className="text-[11px] font-semibold text-gray-800">
                                {TABLE_LABELS[item.table] || item.table}
                                <span className="ml-1 font-normal text-gray-400">
                                    ({item.op === 'create' ? 'novo' : item.op === 'update' ? 'edição' : 'exclusão'})
                                </span>
                            </p>
                            {item.last_error && (
                                <p className="text-[10px] text-red-600 mt-0.5 break-words">{item.last_error}</p>
                            )}
                            <div className="flex gap-2 mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => retryRejected(item.id)}
                                    className="flex-1 py-1 bg-amber-100 text-amber-800 rounded text-[10px] font-medium"
                                >
                                    <i className="fa-solid fa-rotate-right mr-1" /> Tentar novamente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDiscard(item)}
                                    className="flex-1 py-1 bg-red-100 text-red-700 rounded text-[10px] font-medium"
                                >
                                    <i className="fa-solid fa-trash-can mr-1" /> Descartar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
