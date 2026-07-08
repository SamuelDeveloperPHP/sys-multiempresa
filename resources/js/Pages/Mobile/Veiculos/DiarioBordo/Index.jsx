// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Index.jsx
import { useEffect, useState, useCallback } from 'react';
import { Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/diarioBordoRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import ClearCacheButton from '@/Components/Mobile/ClearCacheButton';

export default function DiarioBordoIndex({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[1];
    const { online } = useOnlineStatus();
    const [veiculo, setVeiculo] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const load = useCallback(async () => {
        const v = await veiculosRepo.find(id);
        setVeiculo(v?.veiculo);
        setItems(await repo.listByVeiculo(id));
    }, [id]);

    const syncNow = useCallback(async () => {
        if (!online) return;
        setSyncing(true);
        try { await repo.syncByVeiculo(id); await load(); }
        catch (e) { /* cache */ }
        finally { setSyncing(false); }
    }, [online, id, load]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
            setLoading(false);
            if (online) await syncNow();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return (
        <MobileLayout header={`Diário ${veiculo?.prefixo || ''}`} backUrl={`/mobile/veiculos/${id}`}>
            <Head title="Diário de Bordo" />
            <div className="p-3 space-y-3">
                <div className="flex items-start justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">{items.length} registro(s) em cache</h2>
                    <div className="flex gap-3 items-start">
                        <div className="flex flex-col items-end gap-1.5">
                            {online && !syncing && (
                                <button onClick={syncNow} className="text-xs text-[#557bbb] font-medium">
                                    <i className="fa-solid fa-rotate mr-1" /> Atualizar
                                </button>
                            )}
                            {/* Limpa SÓ o cache deste módulo (diário do veículo) */}
                            <ClearCacheButton
                                clearFn={() => repo.clearSyncedByVeiculo(id)}
                                onCleared={load}
                            />
                        </div>
                        <Link
                            href={`/mobile/veiculos/${id}/diario-bordo/criar`}
                            className="bg-[#2ecc71] text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                        >
                            <i className="fa-solid fa-plus mr-1" /> Novo
                        </Link>
                    </div>
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
        pending_update: { label: 'Editado', color: 'bg-blue-100 text-blue-700' },
        pending_delete: { label: 'A excluir', color: 'bg-red-100 text-red-700' },
    };
    const m = map[status]; if (!m) return null;
    return <span className={`text-[9px] px-1.5 py-0.5 rounded ${m.color} font-medium`}>{m.label}</span>;
}
