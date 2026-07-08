// resources/js/Pages/Mobile/Veiculos/ChecklistFrota/Index.jsx
// -----------------------------------------------------------------------------
// Página principal de checklist: mostra os templates disponíveis (da obra do
// veículo) e o histórico de execuções. Usuário escolhe um template para iniciar
// uma nova execução.
// -----------------------------------------------------------------------------
import { useEffect, useState, useCallback } from 'react';
import { Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/checklistsRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import ClearCacheButton from '@/Components/Mobile/ClearCacheButton';

export default function ChecklistFrotaIndex({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[1];
    const { online } = useOnlineStatus();
    const [veiculo, setVeiculo] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const v = await veiculosRepo.find(id);
        setVeiculo(v?.veiculo);
        // Templates de checklist são POR VEÍCULO (não por obra)
        setTemplates(await repo.listChecklists(id));
        setHistorico(await repo.listServicosByVeiculo(id));
    }, [id]);

    const syncNow = useCallback(async () => {
        if (!online) return;
        try {
            await repo.syncChecklists(id);                 // sync POR VEÍCULO
            await repo.syncServicosByVeiculo(id);
            await load();
        } catch (e) { /* cache */ }
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
        <MobileLayout header={`Checklist ${veiculo?.prefixo || ''}`} backUrl={`/mobile/veiculos/${id}`}>
            <Head title="Checklist do veículo" />
            <div className="p-3 space-y-4">
                {/* Templates disponíveis */}
                <section>
                    <div className="flex items-start justify-between mb-2">
                        <h2 className="text-sm font-semibold text-gray-700">
                            <i className="fa-solid fa-clipboard-list mr-1.5 text-[#0057a3]" />
                            Templates disponíveis
                        </h2>
                        <div className="flex flex-col items-end gap-1.5">
                            {online && (
                                <button onClick={syncNow} className="text-xs text-[#557bbb] font-medium">
                                    <i className="fa-solid fa-rotate mr-1" /> Atualizar
                                </button>
                            )}
                            {/* Limpa SÓ o cache deste módulo (checklists do veículo) */}
                            <ClearCacheButton
                                clearFn={() => repo.clearSyncedByVeiculo(id)}
                                onCleared={load}
                            />
                        </div>
                    </div>
                    {loading ? (
                        <div className="text-center py-6 text-gray-400">
                            <i className="fa-solid fa-spinner fa-spin" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="bg-white rounded-lg p-3 text-center text-xs text-gray-400">
                            Nenhum template disponível para esta obra.
                            {online && <button onClick={syncNow} className="text-[#557bbb] ml-1 font-medium">Atualizar</button>}
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {templates.map(t => (
                                <li key={t.id}>
                                    <Link
                                        href={`/mobile/veiculos/${id}/checklist/iniciar/${t.id}`}
                                        className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50"
                                    >
                                        <div className="w-10 h-10 bg-[#0057a3]/10 rounded-lg flex items-center justify-center">
                                            <i className="fa-solid fa-clipboard-check text-[#0057a3]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm text-gray-800">{t.nome || t.titulo || `Checklist #${t.id}`}</p>
                                            {t.descricao && <p className="text-[11px] text-gray-500 line-clamp-1">{t.descricao}</p>}
                                        </div>
                                        <i className="fa-solid fa-play text-xs text-gray-300" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Histórico de execuções */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-gray-700">
                            <i className="fa-solid fa-clock-rotate-left mr-1.5 text-gray-500" />
                            Histórico ({historico.length})
                        </h2>
                        <Link
                            href={`/mobile/veiculos/${id}/checklist/historico`}
                            className="text-xs text-[#557bbb] font-medium"
                        >
                            Ver tudo
                        </Link>
                    </div>
                    {historico.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-4">Nenhuma execução ainda.</p>
                    ) : (
                        <ul className="space-y-2">
                            {historico.slice(0, 5).map(s => (
                                <li key={s.id || s._local_id}>
                                    <Link
                                        href={`/mobile/veiculos/${id}/checklist/servicos/${s.id || s._local_id}`}
                                        className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-800">
                                                {s.data ? new Date(s.data).toLocaleString('pt-BR') : '—'}
                                            </span>
                                            {s._sync_status && s._sync_status !== 'synced' && (
                                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500">{s.template_nome || 'Checklist'}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
