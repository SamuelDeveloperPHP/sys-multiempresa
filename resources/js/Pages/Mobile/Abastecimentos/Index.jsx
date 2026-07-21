// resources/js/Pages/Mobile/Abastecimentos/Index.jsx
// Lista GLOBAL (cross-veículo) de abastecimentos recentes.
import { Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import { formatWallClock } from '@/utils/datetime';
import GlobalRecentList from '@/Components/Mobile/GlobalRecentList';
import repo from '@/offline/repositories/abastecimentosRepo';

export default function AbastecimentosGlobalIndex() {
    return (
        <MobileLayout header="Abastecimentos">
            <Head title="Abastecimentos" />
            <GlobalRecentList
                title="Abastecimentos recentes"
                icon="fa-gas-pump"
                color="#e67e22"
                repo={repo}
                detailHrefBuilder={(a, v) => v
                    ? `/mobile/veiculos/${v.id}/abastecimentos/${a.id || a._local_id}`
                    : `/mobile/veiculos/${a.veiculo_id}/abastecimentos/${a.id || a._local_id}`}
                renderSummary={(a) => (
                    <>
                        <div className="text-xs text-gray-600 flex justify-between">
                            <span>
                                <i className="fa-solid fa-droplet text-amber-500 mr-1" />
                                {a.quantidade || 0}L · {a.combustivel || '—'}
                            </span>
                            <span className="font-medium text-gray-800">
                                R$ {Number(a.valor_total || 0).toFixed(2)}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {formatWallClock(a.data)}
                            {a.fornecedor && ` · ${a.fornecedor}`}
                        </p>
                    </>
                )}
                emptyLabel="Nenhum abastecimento registrado."
            />
        </MobileLayout>
    );
}
