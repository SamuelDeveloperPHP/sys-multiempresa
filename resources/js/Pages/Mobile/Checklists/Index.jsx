// resources/js/Pages/Mobile/Checklists/Index.jsx
// Lista GLOBAL de execuções de checklist (todos os veículos).
import { Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import { formatWallClock } from '@/utils/datetime';
import GlobalRecentList from '@/Components/Mobile/GlobalRecentList';
import repo from '@/offline/repositories/checklistsRepo';

export default function ChecklistsGlobalIndex() {
    return (
        <MobileLayout header="Checklists">
            <Head title="Checklists" />
            <GlobalRecentList
                title="Checklists realizados"
                icon="fa-clipboard-check"
                color="#0057a3"
                repo={repo}
                detailHrefBuilder={(s, v) => v
                    ? `/mobile/veiculos/${v.id}/checklist/servicos/${s.id || s._local_id}`
                    : `/mobile/veiculos/${s.veiculo_id || s.id_veiculo}/checklist/servicos/${s.id || s._local_id}`}
                renderSummary={(s) => {
                    const respostas = Array.isArray(s.respostas)
                        ? s.respostas
                        : (typeof s.respostas === 'string' ? JSON.parse(s.respostas || '[]') : []);
                    const conformes = respostas.filter(r => r.ok === true).length;
                    const nc = respostas.filter(r => r.ok === false).length;
                    return (
                        <>
                            <p className="text-xs text-gray-600 truncate">{s.template_nome || 'Checklist'}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {formatWallClock(s.data)}
                            </p>
                            {respostas.length > 0 && (
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                        ✓ {conformes} conformes
                                    </span>
                                    {nc > 0 && (
                                        <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium">
                                            ✗ {nc} não conformes
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    );
                }}
                emptyLabel="Nenhum checklist realizado."
            />
        </MobileLayout>
    );
}
