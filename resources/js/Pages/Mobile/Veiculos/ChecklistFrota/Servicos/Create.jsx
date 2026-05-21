// resources/js/Pages/Mobile/Veiculos/ChecklistFrota/Servicos/Create.jsx
// -----------------------------------------------------------------------------
// Formulário dinâmico que carrega os itens do template e permite responder
// OK / Não OK / observação para cada item. Salva tudo como um único registro
// (com JSON de respostas) — simplifica a sincronização.
// -----------------------------------------------------------------------------
import { useEffect, useState, useCallback } from 'react';
import { router, Head, usePage } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/checklistsRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';

export default function ChecklistCreate({ veiculoId, templateId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const tplId = templateId || parts[parts.length - 1];
    const { auth } = usePage().props;

    const [veiculo, setVeiculo] = useState(null);
    const [template, setTemplate] = useState(null);
    const [respostas, setRespostas] = useState({}); // { item_id: { ok, obs } }
    const [meta, setMeta] = useState({
        data: new Date().toISOString().slice(0, 16),
        responsavel: auth?.user?.name || '',
        km_atual: '',
        hr_atual: '',
        observacao_geral: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            const v = await veiculosRepo.find(id);
            setVeiculo(v?.veiculo);
            const tpl = await repo.findChecklist(tplId);
            setTemplate(tpl);
            if (tpl?.itens) {
                const init = {};
                tpl.itens.forEach(it => { init[it.id] = { ok: null, obs: '' }; });
                setRespostas(init);
            }
        })();
    }, [id, tplId]);

    const setResposta = (itemId, key, value) => {
        setRespostas(r => ({ ...r, [itemId]: { ...(r[itemId] || {}), [key]: value } }));
    };

    const handleSave = useCallback(async () => {
        // valida que todos itens obrigatórios tenham resposta
        const obrigatorios = (template?.itens || []).filter(i => i.obrigatorio !== false);
        const naoRespondidos = obrigatorios.filter(i => respostas[i.id]?.ok == null);
        if (naoRespondidos.length) {
            setError(`Responda os ${naoRespondidos.length} item(s) obrigatório(s).`);
            return;
        }
        setSaving(true); setError(null);
        try {
            const payload = {
                veiculo_id: Number(id),
                checklist_id: Number(tplId),
                template_nome: template?.nome || template?.titulo || null,
                data: meta.data,
                responsavel: meta.responsavel,
                km_atual: meta.km_atual ? parseFloat(meta.km_atual) : null,
                hr_atual: meta.hr_atual ? parseFloat(meta.hr_atual) : null,
                observacao_geral: meta.observacao_geral,
                respostas: Object.entries(respostas).map(([itemId, r]) => ({
                    item_id: Number(itemId),
                    item_nome: template.itens.find(i => i.id == itemId)?.nome,
                    ok: r.ok,
                    obs: r.obs || null,
                })),
            };
            await repo.createServico(payload);
            router.visit(`/mobile/veiculos/${id}/checklist`);
        } catch (e) {
            setError(e.message); setSaving(false);
        }
    }, [respostas, meta, id, tplId, template]);

    if (!template) {
        return (
            <MobileLayout header="Carregando template…" backUrl={`/mobile/veiculos/${id}/checklist`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                </div>
            </MobileLayout>
        );
    }

    const isMaquina = veiculo?.tipo_hr == 1;
    const respondidos = Object.values(respostas).filter(r => r.ok != null).length;
    const total = template.itens?.length || 0;

    return (
        <MobileLayout header={template.nome || 'Checklist'} backUrl={`/mobile/veiculos/${id}/checklist`} hideBottomNav>
            <Head title="Executar checklist" />
            <div className="p-3 space-y-3">
                <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                    Veículo: <strong>{veiculo?.prefixo}</strong>
                </div>

                {/* Progresso */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600">Progresso</span>
                        <span className="text-xs font-bold text-[#557bbb]">{respondidos} / {total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#557bbb] rounded-full transition-all"
                            style={{ width: `${total > 0 ? (respondidos / total) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Meta */}
                <div className="bg-white rounded-xl p-3 shadow-sm space-y-2">
                    <Field label="Data e hora">
                        <input type="datetime-local" value={meta.data}
                            onChange={(e) => setMeta(m => ({ ...m, data: e.target.value }))} className="input" />
                    </Field>
                    <Field label="Responsável">
                        <input value={meta.responsavel}
                            onChange={(e) => setMeta(m => ({ ...m, responsavel: e.target.value }))} className="input" />
                    </Field>
                    {isMaquina ? (
                        <Field label="Horímetro atual">
                            <input type="number" step="0.1" value={meta.hr_atual}
                                onChange={(e) => setMeta(m => ({ ...m, hr_atual: e.target.value }))} className="input" />
                        </Field>
                    ) : (
                        <Field label="KM atual">
                            <input type="number" value={meta.km_atual}
                                onChange={(e) => setMeta(m => ({ ...m, km_atual: e.target.value }))} className="input" />
                        </Field>
                    )}
                </div>

                {/* Itens */}
                <div className="space-y-2">
                    {(template.itens || []).map((item, idx) => {
                        const resp = respostas[item.id] || {};
                        const valida = resp.ok === true;
                        const invalida = resp.ok === false;
                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${
                                    valida ? 'border-emerald-500' :
                                    invalida ? 'border-red-500' :
                                    'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="text-xs text-gray-400 font-mono">{idx + 1}.</span>
                                    <p className="flex-1 text-sm font-medium text-gray-800">{item.nome || item.descricao}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setResposta(item.id, 'ok', true)}
                                        className={`py-2 rounded-md font-medium text-xs ${
                                            valida ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <i className="fa-solid fa-check mr-1" /> Conforme
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResposta(item.id, 'ok', false)}
                                        className={`py-2 rounded-md font-medium text-xs ${
                                            invalida ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <i className="fa-solid fa-xmark mr-1" /> Não conforme
                                    </button>
                                </div>
                                {invalida && (
                                    <textarea
                                        rows={2}
                                        value={resp.obs || ''}
                                        onChange={(e) => setResposta(item.id, 'obs', e.target.value)}
                                        placeholder="Descreva a não conformidade…"
                                        className="input text-xs"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Observação geral */}
                <Field label="Observação geral">
                    <textarea rows={3} value={meta.observacao_geral}
                        onChange={(e) => setMeta(m => ({ ...m, observacao_geral: e.target.value }))} className="input" />
                </Field>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">{error}</div>
                )}

                <div className="flex gap-2 pt-2">
                    <button onClick={() => router.visit(`/mobile/veiculos/${id}/checklist`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-[#0057a3] text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Salvando…</>
                                : <><i className="fa-solid fa-save mr-1" /> Finalizar</>}
                    </button>
                </div>
            </div>
            <style>{`.input{width:100%;padding:.55rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.875rem;background:white}.input:focus{outline:none;border-color:#557bbb;box-shadow:0 0 0 1px #557bbb}`}</style>
        </MobileLayout>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            {children}
        </div>
    );
}
