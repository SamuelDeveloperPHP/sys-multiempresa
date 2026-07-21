// resources/js/Pages/Mobile/Veiculos/ChecklistFrota/Servicos/Show.jsx
import { useEffect, useState } from 'react';
import { router, Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import { formatWallClock } from '@/utils/datetime';
import FotoEvidencia from '@/Components/Mobile/FotoEvidencia';
import { alertDialog } from '@/utils/dialogs';
import repo from '@/offline/repositories/checklistsRepo';

export default function ChecklistServicoShow({ veiculoId, servicoId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const sId = servicoId || parts[parts.indexOf('servicos') + 1];

    const [s, setS] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { (async () => { setS(await repo.findServico(sId)); })(); }, [sId]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await repo.removeServico(sId);
            router.visit(`/mobile/veiculos/${id}/checklist`);
        } catch (e) {
            await alertDialog({ title: 'Erro ao excluir', text: e.message, icon: 'error' });
            setDeleting(false);
        }
    };

    if (!s) {
        return (
            <MobileLayout header="Carregando…" backUrl={`/mobile/veiculos/${id}/checklist`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                </div>
            </MobileLayout>
        );
    }

    const respostas = Array.isArray(s.respostas)
        ? s.respostas
        : (typeof s.respostas === 'string' ? JSON.parse(s.respostas || '[]') : []);

    const conformes = respostas.filter(r => r.ok === true).length;
    const naoConformes = respostas.filter(r => r.ok === false).length;

    return (
        <MobileLayout header="Checklist realizado" backUrl={`/mobile/veiculos/${id}/checklist`} hideBottomNav>
            <Head title="Checklist" />
            <div className="p-3 space-y-3">
                {s._sync_status && s._sync_status !== 'synced' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-clock mr-1" /> Ainda não enviado ao servidor.
                    </div>
                )}

                <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <i className="fa-solid fa-clipboard-check text-2xl text-[#0057a3]" />
                        <div className="flex-1">
                            <p className="font-bold text-gray-800">{s.template_nome || 'Checklist'}</p>
                            <p className="text-xs text-gray-500">
                                {formatWallClock(s.data)}
                            </p>
                        </div>
                    </div>
                    {s.responsavel && <Row label="Responsável" value={s.responsavel} />}
                    {s.km_atual != null && <Row label="KM" value={Number(s.km_atual).toLocaleString('pt-BR')} />}
                    {s.hr_atual != null && <Row label="Horímetro" value={Number(s.hr_atual).toLocaleString('pt-BR')} />}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                        <div className="bg-emerald-50 rounded-lg p-2 text-center">
                            <p className="text-xl font-bold text-emerald-700">{conformes}</p>
                            <p className="text-[10px] text-emerald-600 font-medium uppercase">Conformes</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center">
                            <p className="text-xl font-bold text-red-700">{naoConformes}</p>
                            <p className="text-[10px] text-red-600 font-medium uppercase">Não conformes</p>
                        </div>
                    </div>
                </div>

                {/* Respostas */}
                <div className="space-y-2">
                    {respostas.map((r, i) => (
                        <div
                            key={i}
                            className={`bg-white rounded-lg p-2.5 shadow-sm border-l-4 ${
                                r.ok ? 'border-emerald-500' : 'border-red-500'
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <i className={`fa-solid ${r.ok ? 'fa-check text-emerald-500' : 'fa-xmark text-red-500'} mt-0.5`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">{r.item_nome}</p>
                                    {r.obs && (
                                        <p className="text-[11px] text-gray-600 mt-1 italic">"{r.obs}"</p>
                                    )}
                                    {/* Foto: local (base64, pendente) ou do servidor (foto_url) */}
                                    <FotoEvidencia src={r.foto_data_url || r.foto_url} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {s.observacao_geral && (
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Observação geral:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{s.observacao_geral}</p>
                    </div>
                )}

                <div className="flex gap-2">
                    <Link href={`/mobile/veiculos/${id}/checklist/servicos/${sId}/editar`}
                        className="flex-1 py-2.5 bg-[#557bbb] text-white rounded-lg font-semibold text-sm text-center">
                        <i className="fa-solid fa-pen mr-1" /> Editar
                    </Link>
                    {!confirmDelete ? (
                        <button onClick={() => setConfirmDelete(true)}
                            className="flex-1 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold text-sm">
                            <i className="fa-solid fa-trash mr-1" /> Excluir
                        </button>
                    ) : (
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                            {deleting ? 'Excluindo…' : 'Confirmar?'}
                        </button>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-500">{label}:</span>
            <span className="text-gray-800">{value}</span>
        </div>
    );
}
