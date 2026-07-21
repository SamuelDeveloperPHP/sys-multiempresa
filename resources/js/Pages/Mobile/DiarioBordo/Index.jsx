// resources/js/Pages/Mobile/DiarioBordo/Index.jsx
// Lista GLOBAL (cross-veículo) de registros do diário de bordo.
import { Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import { formatWallClock } from '@/utils/datetime';
import GlobalRecentList from '@/Components/Mobile/GlobalRecentList';
import repo from '@/offline/repositories/diarioBordoRepo';

export default function DiarioBordoGlobalIndex() {
    return (
        <MobileLayout header="Diário de Bordo">
            <Head title="Diário de Bordo" />
            <GlobalRecentList
                title="Diário de Bordo"
                icon="fa-book"
                color="#2ecc71"
                repo={repo}
                detailHrefBuilder={(d, v) => v
                    ? `/mobile/veiculos/${v.id}/diario-bordo/${d.id || d._local_id}`
                    : `/mobile/veiculos/${d.veiculo_id || d.id_veiculo}/diario-bordo/${d.id || d._local_id}`}
                renderSummary={(d) => (
                    <>
                        <p className="text-xs text-gray-600 truncate">
                            {d.responsavel && <span>👷 {d.responsavel} · </span>}
                            {formatWallClock(d.data)}
                        </p>
                        {d.descricao && (
                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{d.descricao}</p>
                        )}
                    </>
                )}
                emptyLabel="Nenhum registro no diário."
            />
        </MobileLayout>
    );
}
