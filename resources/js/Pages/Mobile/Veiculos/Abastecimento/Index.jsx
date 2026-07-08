// resources/js/Pages/Mobile/Veiculos/Abastecimento/Index.jsx
import { useEffect, useState, useCallback } from 'react';
import { Link, Head } from '@inertiajs/react';
import { useLiveQuery } from 'dexie-react-hooks';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/abastecimentosRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import ClearCacheButton from '@/Components/Mobile/ClearCacheButton';

export default function AbastecimentoIndex({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[1];
    const { online } = useOnlineStatus();
    const [veiculo, setVeiculo] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // Lista REATIVA (Dexie liveQuery): re-renderiza sozinha quando o sync ou
    // o limpar cache mexem no banco local — o badge "Pendente" some na hora.
    const items = useLiveQuery(() => repo.listByVeiculo(id), [id]);
    const loading = items === undefined;

    const syncNow = useCallback(async () => {
        if (!online) return;
        setSyncing(true);
        try { await repo.syncByVeiculo(id); }
        catch (err) { /* mantém cache */ }
        finally { setSyncing(false); }
    }, [online, id]);

    useEffect(() => {
        (async () => {
            const v = await veiculosRepo.find(id);
            setVeiculo(v?.veiculo);
            if (online) await syncNow();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return (
        <MobileLayout header={`Abastec. ${veiculo?.prefixo || ''}`} backUrl={`/mobile/veiculos/${id}`}>
            <Head title="Abastecimentos" />

            <div className="p-3 space-y-3">
                {/* Ações na mesma linha, CENTRALIZADAS; contagem logo abaixo */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {online && !syncing && (
                            <button onClick={syncNow} className="text-sm text-[#557bbb] font-medium">
                                <i className="fa-solid fa-rotate mr-1" /> Atualizar
                            </button>
                        )}
                        {/* Limpa SÓ o cache deste módulo (lista é reativa — atualiza sozinha) */}
                        <ClearCacheButton clearFn={() => repo.clearSyncedByVeiculo(id)} />
                        <Link
                            href={`/mobile/veiculos/${id}/abastecimentos/criar`}
                            className="bg-[#e67e22] text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                        >
                            <i className="fa-solid fa-plus mr-1" /> Novo
                        </Link>
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700">
                        {(items || []).length} registro(s) em cache
                    </h2>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-spinner fa-spin text-2xl" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-gas-pump text-3xl mb-2" />
                        <p className="text-sm">Nenhum abastecimento ainda.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((a) => (
                            <li key={a.id || a._local_id}>
                                <Link
                                    href={`/mobile/veiculos/${id}/abastecimentos/${a.id || a._local_id}`}
                                    className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-800">
                                            {a.data ? new Date(a.data).toLocaleString('pt-BR') : '—'}
                                        </span>
                                        {a._sync_status && a._sync_status !== 'synced' && (
                                            <SyncBadge status={a._sync_status} />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                                        <span>
                                            <i className="fa-solid fa-droplet text-amber-500 mr-1" />
                                            {a.quantidade || 0}L de {a.combustivel || '—'}
                                        </span>
                                        <span className="text-right font-medium text-gray-800">
                                            R$ {Number(a.valor_total || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    {a.fornecedor && (
                                        <p className="text-[11px] text-gray-500 mt-1 truncate">
                                            🏪 {a.fornecedor}
                                        </p>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}

function SyncBadge({ status }) {
    const map = {
        pending_create: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
        pending_update: { label: 'Editado', color: 'bg-blue-100 text-blue-700' },
        pending_delete: { label: 'A excluir', color: 'bg-red-100 text-red-700' },
        rejected:       { label: 'Rejeitado', color: 'bg-red-100 text-red-700' },
    };
    const m = map[status];
    if (!m) return null;
    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${m.color} font-medium`}>
            {m.label}
        </span>
    );
}
