// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Index.jsx
import { useEffect, useState, useCallback } from 'react';
import { Link, Head } from '@inertiajs/react';
import { useLiveQuery } from 'dexie-react-hooks';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/diarioBordoRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import ClearCacheButton from '@/Components/Mobile/ClearCacheButton';

export default function DiarioBordoIndex({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[1];
    const { online } = useOnlineStatus();
    const [veiculo, setVeiculo] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // Lista REATIVA (Dexie liveQuery): reflete sync/limpeza na hora.
    const items = useLiveQuery(() => repo.listByVeiculo(id), [id]);
    const loading = items === undefined;

    const syncNow = useCallback(async () => {
        if (!online) return;
        setSyncing(true);
        try { await repo.syncByVeiculo(id); }
        catch (e) { /* cache */ }
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
        <MobileLayout header={`Diário ${veiculo?.prefixo || ''}`} backUrl={`/mobile/veiculos/${id}`}>
            <Head title="Diário de Bordo" />
            <div className="p-3 space-y-3">
                {/* Ações na mesma linha, CENTRALIZADAS; contagem logo abaixo */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {online && !syncing && (
                            <button onClick={syncNow}
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#557bbb]/10 text-[#557bbb] border border-[#557bbb]/40 active:bg-[#557bbb]/20">
                                <i className="fa-solid fa-rotate mr-1" /> Atualizar
                            </button>
                        )}
                        {/* Limpa SÓ o cache deste módulo (lista é reativa — atualiza sozinha) */}
                        <ClearCacheButton clearFn={() => repo.clearSyncedByVeiculo(id)} />
                        <Link
                            href={`/mobile/veiculos/${id}/diario-bordo/criar`}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#2ecc71] text-white active:bg-[#27ae60]"
                        >
                            <i className="fa-solid fa-plus mr-1" /> Novo
                        </Link>
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700">{(items || []).length} registro(s) em cache</h2>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-spinner fa-spin text-2xl" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-book text-3xl mb-2" />
                        <p className="text-sm">Nenhum registro no diário.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map(d => (
                            <li key={d.id || d._local_id}>
                                <Link
                                    href={`/mobile/veiculos/${id}/diario-bordo/${d.id || d._local_id}`}
                                    className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-800">
                                            {d.data ? new Date(d.data).toLocaleString('pt-BR') : '—'}
                                        </span>
                                        {d._sync_status && d._sync_status !== 'synced' && <SyncBadge status={d._sync_status} />}
                                    </div>
                                    {d.responsavel && (
                                        <p className="text-[11px] text-gray-500">👷 {d.responsavel}</p>
                                    )}
                                    {d.descricao && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{d.descricao}</p>
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
        rejected:       { label: 'Rejeitado', color: 'bg-red-100 text-red-700' },
        pending_update: { label: 'Editado', color: 'bg-blue-100 text-blue-700' },
        pending_delete: { label: 'A excluir', color: 'bg-red-100 text-red-700' },
    };
    const m = map[status]; if (!m) return null;
    return <span className={`text-[9px] px-1.5 py-0.5 rounded ${m.color} font-medium`}>{m.label}</span>;
}
