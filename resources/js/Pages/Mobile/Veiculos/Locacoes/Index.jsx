// resources/js/Pages/Mobile/Veiculos/Locacoes/Index.jsx
import { useEffect, useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/locacoesRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function LocacoesIndex({ veiculoId }) {
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
        catch (e) {} finally { setSyncing(false); }
    }, [online, id, load]);

    useEffect(() => {
        (async () => {
            setLoading(true); await load(); setLoading(false);
            if (online) await syncNow();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return (
        <MobileLayout header={`Locações ${veiculo?.prefixo || ''}`} backUrl={`/mobile/veiculos/${id}`}>
            <Head title="Locações" />
            <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">{items.length} locação(ões)</h2>
                    {online && !syncing && (
                        <button onClick={syncNow} className="text-xs text-[#557bbb] font-medium">
                            <i className="fa-solid fa-rotate mr-1" /> Atualizar
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-spinner fa-spin text-2xl" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <i className="fa-solid fa-handshake text-3xl mb-2" />
                        <p className="text-sm">Nenhuma locação registrada.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map(l => (
                            <li key={l.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-gray-800">
                                        Locação #{l.id}
                                    </span>
                                    <StatusBadge status={l.status} />
                                </div>
                                {l.cliente && <p className="text-xs text-gray-600">🏢 {l.cliente}</p>}
                                {(l.data_inicio || l.data_fim) && (
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        {l.data_inicio || '?'} → {l.data_fim || 'em andamento'}
                                    </p>
                                )}
                                {l.valor_diaria != null && (
                                    <p className="text-xs text-gray-700 mt-1 font-medium">
                                        R$ {Number(l.valor_diaria).toFixed(2)} / dia
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}

function StatusBadge({ status }) {
    const s = String(status || '').toLowerCase();
    const map = {
        'ativa':       { label: 'Ativa',       color: 'bg-emerald-100 text-emerald-700' },
        'em andamento':{ label: 'Em andamento',color: 'bg-emerald-100 text-emerald-700' },
        'encerrada':   { label: 'Encerrada',   color: 'bg-gray-100 text-gray-600' },
        'cancelada':   { label: 'Cancelada',   color: 'bg-red-100 text-red-700' },
    };
    const m = map[s] || { label: status || '—', color: 'bg-gray-100 text-gray-600' };
    return <span className={`text-[10px] px-2 py-0.5 rounded ${m.color} font-medium`}>{m.label}</span>;
}
