// resources/js/Pages/Mobile/Veiculos/ChecklistFrota/Servicos/Edit.jsx
// -----------------------------------------------------------------------------
// Edição de execução de checklist: permite revisar respostas e mudar status.
// -----------------------------------------------------------------------------
import { useEffect, useState, useCallback } from 'react';
import { router, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/checklistsRepo';

export default function ChecklistServicoEdit({ veiculoId, servicoId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const sId = servicoId || parts[parts.indexOf('servicos') + 1];

    const [s, setS] = useState(null);
    const [respostas, setRespostas] = useState([]);
    const [observacaoGeral, setObservacaoGeral] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            const rec = await repo.findServico(sId);
            if (!rec) { setError('Registro não encontrado.'); return; }
            setS(rec);
            const r = Array.isArray(rec.respostas)
                ? rec.respostas
                : (typeof rec.respostas === 'string' ? JSON.parse(rec.respostas || '[]') : []);
            setRespostas(r);
            setObservacaoGeral(rec.observacao_geral || '');
        })();
    }, [sId]);

    const setResposta = (idx, key, value) => {
        setRespostas(rs => rs.map((r, i) => i === idx ? { ...r, [key]: value } : r));
    };

    const handleSave = useCallback(async () => {
        setSaving(true); setError(null);
        try {
            await repo.updateServico(sId, {
                respostas,
                observacao_geral: observacaoGeral,
            });
            router.visit(`/mobile/veiculos/${id}/checklist/servicos/${sId}`);
        } catch (e) {
            setError(e.message); setSaving(false);
        }
    }, [respostas, observacaoGeral, sId, id]);

    if (!s) {
        return (
            <MobileLayout header="Carregando…" backUrl={`/mobile/veiculos/${id}/checklist`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout header="Editar checklist" backUrl={`/mobile/veiculos/${id}/checklist/servicos/${sId}`} hideBottomNav>
            <Head title="Editar checklist" />
            <div className="p-3 space-y-2">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">{error}</div>
                )}

                {respostas.map((r, i) => (
                    <div
                        key={i}
                        className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${
                            r.ok === true ? 'border-emerald-500' :
                            r.ok === false ? 'border-red-500' :
                            'border-gray-200'
                        }`}
                    >
                        <p className="text-sm font-medium text-gray-800 mb-2">{r.item_nome}</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <button
                                onClick={() => setResposta(i, 'ok', true)}
                                className={`py-2 rounded-md font-medium text-xs ${
                                    r.ok === true ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <i className="fa-solid fa-check mr-1" /> Conforme
                            </button>
                            <button
                                onClick={() => setResposta(i, 'ok', false)}
                                className={`py-2 rounded-md font-medium text-xs ${
                                    r.ok === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <i className="fa-solid fa-xmark mr-1" /> Não conforme
                            </button>
                        </div>
                        {r.ok === false && (
                            <textarea
                                rows={2}
                                value={r.obs || ''}
                                onChange={(e) => setResposta(i, 'obs', e.target.value)}
                                className="input text-xs"
                                placeholder="Descreva a não conformidade…"
                            />
                        )}
                    </div>
                ))}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observação geral</label>
                    <textarea rows={3} value={observacaoGeral}
                        onChange={(e) => setObservacaoGeral(e.target.value)} className="input" />
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={() => router.visit(`/mobile/veiculos/${id}/checklist/servicos/${sId}`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-[#557bbb] text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                        {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                </div>
            </div>
            <style>{`.input{width:100%;padding:.55rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.875rem;background:white}.input:focus{outline:none;border-color:#557bbb;box-shadow:0 0 0 1px #557bbb}`}</style>
        </MobileLayout>
    );
}
