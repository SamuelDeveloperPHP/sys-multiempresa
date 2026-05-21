// resources/js/Pages/Mobile/Locacoes/Index.jsx
// Lista GLOBAL de locações (todos os veículos).
import { Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import GlobalRecentList from '@/Components/Mobile/GlobalRecentList';
import repo from '@/offline/repositories/locacoesRepo';

export default function LocacoesGlobalIndex() {
    // Adapter: locacoesRepo não tem listAllRecent — usa listAll
    const adaptedRepo = {
        ...repo,
        listAllRecent: () => repo.listAll(),
    };

    return (
        <MobileLayout header="Locações">
            <Head title="Locações" />
            <GlobalRecentList
                title="Locações"
                icon="fa-handshake"
                color="#9b59b6"
                repo={adaptedRepo}
                detailHrefBuilder={(l, v) => v
                    ? `/mobile/veiculos/${v.id}/locacoes`
                    : `/mobile/veiculos/${l.veiculo_id || l.id_veiculo}/locacoes`}
                renderSummary={(l) => (
                    <>
                        <p className="text-xs text-gray-600">
                            {l.cliente && <span>🏢 {l.cliente} · </span>}
                            <StatusInline status={l.status} />
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {l.data_inicio || '?'} → {l.data_fim || 'em andamento'}
                            {l.valor_diaria != null && ` · R$ ${Number(l.valor_diaria).toFixed(2)}/dia`}
                        </p>
                    </>
                )}
                emptyLabel="Nenhuma locação cadastrada."
            />
        </MobileLayout>
    );
}

function StatusInline({ status }) {
    const s = String(status || '').toLowerCase();
    const map = {
        'ativa':        { label: 'Ativa',       color: 'text-emerald-700' },
        'em andamento': { label: 'Em andamento',color: 'text-emerald-700' },
        'encerrada':    { label: 'Encerrada',   color: 'text-gray-600' },
        'cancelada':    { label: 'Cancelada',   color: 'text-red-700' },
    };
    const m = map[s] || { label: status || '—', color: 'text-gray-600' };
    return <span className={`${m.color} font-medium`}>{m.label}</span>;
}
