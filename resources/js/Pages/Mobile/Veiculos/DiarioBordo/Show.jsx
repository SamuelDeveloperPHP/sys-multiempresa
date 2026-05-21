// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Show.jsx
import { useEffect, useState } from 'react';
import { router, Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/diarioBordoRepo';

export default function DiarioBordoShow({ veiculoId, diarioId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const dId = diarioId || parts[parts.indexOf('diario-bordo') + 1];

    const [d, setD] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { (async () => { setD(await repo.find(dId)); })(); }, [dId]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await repo.remove(dId);
            router.visit(`/mobile/veiculos/${id}/diario-bordo`);
        } catch (e) {
            alert(e.message); setDeleting(false);
        }
    };

    if (!d) {
        return (
            <MobileLayout header="Carregando…" backUrl={`/mobile/veiculos/${id}/diario-bordo`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout header="Diário de bordo" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
            <Head title="Diário" />
            <div className="p-3 space-y-3">
                {d._sync_status && d._sync_status !== 'synced' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-clock mr-1" /> Ainda não enviado ao servidor.
                    </div>
                )}

                <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <i className="fa-solid fa-book text-2xl text-[#2ecc71]" />
                        <div>
                            <p className="font-bold text-gray-800">
                                {d.data ? new Date(d.data).toLocaleString('pt-BR') : '—'}
                            </p>
                            {d.responsavel && <p className="text-xs text-gray-500">{d.responsavel}</p>}
                        </div>
                    </div>
                    {(d.km_inicial != null || d.km_final != null) && (
                        <Row label="KM" value={`${d.km_inicial || '—'} → ${d.km_final || '—'}`} />
                    )}
                    {(d.hr_inicial != null || d.hr_final != null) && (
                        <Row label="Horímetro" value={`${d.hr_inicial || '—'} → ${d.hr_final || '—'}`} />
                    )}
                    {d.descricao && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Descrição:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{d.descricao}</p>
                        </div>
                    )}
                    {d.observacao && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Observação:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{d.observacao}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Link href={`/mobile/veiculos/${id}/diario-bordo/${dId}/editar`}
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
