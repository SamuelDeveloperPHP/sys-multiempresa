// resources/js/Pages/Mobile/Veiculos/Abastecimento/Show.jsx
import { useEffect, useState } from 'react';
import { router, Link, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import FotoEvidencia from '@/Components/Mobile/FotoEvidencia';
import repo from '@/offline/repositories/abastecimentosRepo';

export default function AbastecimentoShow({ veiculoId, abastecimentoId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const aId = abastecimentoId || parts[parts.indexOf('abastecimentos') + 1];

    const [a, setA] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        (async () => { setA(await repo.find(aId)); })();
    }, [aId]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await repo.remove(aId);
            router.visit(`/mobile/veiculos/${id}/abastecimentos`);
        } catch (e) {
            alert('Erro: ' + e.message);
            setDeleting(false);
        }
    };

    if (!a) {
        return (
            <MobileLayout header="Carregando…" backUrl={`/mobile/veiculos/${id}/abastecimentos`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout header="Detalhe do abastecimento" backUrl={`/mobile/veiculos/${id}/abastecimentos`} hideBottomNav>
            <Head title="Abastecimento" />
            <div className="p-3 space-y-3">
                {a._sync_status && a._sync_status !== 'synced' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-clock mr-1" />
                        Este registro ainda não foi enviado ao servidor.
                    </div>
                )}

                <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <i className="fa-solid fa-gas-pump text-2xl text-[#e67e22]" />
                        <div>
                            <p className="font-bold text-gray-800">
                                {a.data ? new Date(a.data).toLocaleString('pt-BR') : '—'}
                            </p>
                            <p className="text-xs text-gray-500">{a.combustivel}</p>
                        </div>
                    </div>
                    <Row label="Fornecedor" value={a.fornecedor || '—'} />
                    <Row label="Quantidade" value={`${a.quantidade || 0} L`} />
                    <Row label="Valor/L" value={`R$ ${Number(a.valor_do_litro || 0).toFixed(3)}`} />
                    <Row label="Valor total" value={`R$ ${Number(a.valor_total || 0).toFixed(2)}`} bold />
                    {a.km_atual != null && <Row label="KM atual" value={Number(a.km_atual).toLocaleString('pt-BR')} />}
                    {a.hr_atual != null && <Row label="Horímetro" value={Number(a.hr_atual).toLocaleString('pt-BR')} />}
                    {a.observacao && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Observação:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{a.observacao}</p>
                        </div>
                    )}
                    {/* Comprovante: base64 local (pendente) ou URL do servidor */}
                    {(a.arquivo_app_data_url || a.comprovante_url) && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Comprovante:</p>
                            <FotoEvidencia src={a.arquivo_app_data_url || a.comprovante_url} alt="Foto do comprovante" />
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Link
                        href={`/mobile/veiculos/${id}/abastecimentos/${aId}/editar`}
                        className="flex-1 py-2.5 bg-[#557bbb] text-white rounded-lg font-semibold text-sm text-center"
                    >
                        <i className="fa-solid fa-pen mr-1" /> Editar
                    </Link>
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="flex-1 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold text-sm"
                        >
                            <i className="fa-solid fa-trash mr-1" /> Excluir
                        </button>
                    ) : (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm disabled:opacity-60"
                        >
                            {deleting ? 'Excluindo…' : 'Confirmar?'}
                        </button>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

function Row({ label, value, bold }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-500">{label}:</span>
            <span className={`text-gray-800 ${bold ? 'font-bold' : ''}`}>{value}</span>
        </div>
    );
}
