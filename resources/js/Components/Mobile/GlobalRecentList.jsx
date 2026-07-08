// resources/js/Components/Mobile/GlobalRecentList.jsx
// -----------------------------------------------------------------------------
// Componente genérico de lista global (cross-veículo). Usado pelas pages:
//   /mobile/abastecimentos
//   /mobile/diario-bordo
//   /mobile/checklists
//   /mobile/locacoes
//
// Cada page passa: { repo, veiculosMap, icon, color, route, ... }.
// Aqui fazemos: load do cache, sync se online, busca por veículo, render
// uniforme com badge de sync_status e link para o detalhe.
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { useLiveQuery } from 'dexie-react-hooks';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import db from '@/offline/db';

export default function GlobalRecentList({
    title,
    icon,
    color = '#557bbb',
    repo,
    detailHrefBuilder, // (item, veiculo) => '/mobile/veiculos/{id}/{tipo}/{itemId}'
    renderSummary,     // (item) => JSX dentro do card
    emptyLabel = 'Nenhum registro ainda.',
}) {
    const { online } = useOnlineStatus();
    const [syncing, setSyncing] = useState(false);
    const [query, setQuery] = useState('');

    // Listas REATIVAS (Dexie liveQuery): refletem sync/limpeza na hora —
    // o badge "Pendente" some assim que o envio conclui.
    const items = useLiveQuery(() => (
        repo.listAllRecent ? repo.listAllRecent(100)
          : repo.listAllRecentServicos ? repo.listAllRecentServicos(100)
          : repo.listAll()
    ), [repo]);
    const veiculos = useLiveQuery(() => db.veiculos.toArray(), []);
    const loading = items === undefined || veiculos === undefined;

    const veiculosMap = useMemo(() => {
        const map = {};
        (veiculos || []).forEach(v => { map[v.id] = v; });
        return map;
    }, [veiculos]);

    const syncNow = useCallback(async () => {
        if (!online) return;
        setSyncing(true);
        try {
            if (repo.syncAllRecent) await repo.syncAllRecent();
            else if (repo.syncAllRecentServicos) await repo.syncAllRecentServicos();
        } catch (e) {
            console.warn('[GlobalRecentList] sync falhou:', e.message);
        } finally {
            setSyncing(false);
        }
    }, [online, repo]);

    useEffect(() => {
        if (online) syncNow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toUpperCase();
        if (!q) return items;
        return items.filter(it => {
            const veiculoId = it.veiculo_id ?? it.id_veiculo;
            const v = veiculosMap[veiculoId];
            const prefixo = String(v?.prefixo || '').toUpperCase();
            const placa = String(v?.placa || '').toUpperCase();
            return prefixo.includes(q) || placa.includes(q);
        });
    }, [items, query, veiculosMap]);

    return (
        <div className="p-3 space-y-3">
            {/* Header com search e action sync */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                        <i className={`fa-solid ${icon} text-lg`} style={{ color }} />
                    </div>
                    <div className="flex-1">
                        <h1 className="font-bold text-gray-800 text-sm">{title}</h1>
                        <p className="text-[11px] text-gray-500">{items.length} registro(s) no cache</p>
                    </div>
                    {online && !syncing && (
                        <button onClick={syncNow} className="text-xs text-[#557bbb] font-medium px-2 py-1">
                            <i className="fa-solid fa-rotate mr-1" /> Atualizar
                        </button>
                    )}
                    {syncing && (
                        <span className="text-xs text-[#557bbb]">
                            <i className="fa-solid fa-spinner fa-spin" />
                        </span>
                    )}
                </div>
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filtrar por prefixo/placa do veículo…"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb]"
                        autoCapitalize="characters"
                    />
                </div>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <i className={`fa-solid ${icon} text-3xl mb-2`} />
                    <p className="text-sm">{query ? `Nada encontrado para "${query}".` : emptyLabel}</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {filtered.map(it => {
                        const veiculoId = it.veiculo_id ?? it.id_veiculo;
                        const v = veiculosMap[veiculoId];
                        const href = detailHrefBuilder(it, v);
                        return (
                            <li key={it.id || it._local_id}>
                                <Link href={href} className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-700">
                                            {v ? `${v.tipo == 4 ? '🚜' : '🚛'} ${v.prefixo}` : `Veículo #${veiculoId}`}
                                        </span>
                                        {it._sync_status && it._sync_status !== 'synced' && <SyncBadge status={it._sync_status} />}
                                    </div>
                                    {renderSummary(it, v)}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
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
