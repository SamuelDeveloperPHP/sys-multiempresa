// resources/js/Pages/Mobile/Veiculos/ChecklistFrota/Servicos/Create.jsx
// -----------------------------------------------------------------------------
// Execução de checklist — port das regras do legado.
//
// REGRAS:
//   - Tipo via query string: ?tipo=abertura ou ?tipo=encerramento
//   - Default: ABERTURA (salva com ciclo_status='ABERTO')
//   - ENCERRAMENTO salva com ciclo_status='FECHADO'
//   - BLOQUEIA abertura se já há checklist ABERTO em OUTRO veículo
//   - Cada item: OK / Não OK + observação + FOTO via câmera
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { router, Head, usePage, Link } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/checklistsRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import IntegerInput from '@/Components/Mobile/IntegerInput';
import CameraCapture from '@/Components/Mobile/CameraCapture';
import useOpenCycles from '@/offline/hooks/useOpenCycles';
import { integerNumberValue } from '@/utils/numberInput';
import { nowLocalDMYHM, nowLocalTimestamp } from '@/utils/datetime';

function getTipoFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const t = (params.get('tipo') || 'abertura').toLowerCase();
    return t === 'encerramento' || t === 'encerrar' || t === 'fechamento' ? 'ENCERRAMENTO' : 'ABERTURA';
}

export default function ChecklistCreate({ veiculoId, templateId }) {
    const parts = window.location.pathname.split('/');
    const id = Number(veiculoId || parts[parts.indexOf('veiculos') + 1]);
    const tplId = templateId || parts[parts.length - 1].split('?')[0];
    const { auth } = usePage().props;
    const userId = auth?.user?.id;

    const [tipo] = useState(getTipoFromUrl());
    const isAbertura = tipo === 'ABERTURA';

    const [veiculo, setVeiculo] = useState(null);
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0); // "Tentar novamente" re-dispara o load
    const [respostas, setRespostas] = useState({}); // { item_id: { ok, obs, foto_data_url } }
    const [meta, setMeta] = useState({
        responsavel: auth?.user?.name || '',
        km_atual: '',
        hr_atual: '',
        observacao_geral: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(null); // item_id atualmente capturando

    const { getOpenInOtherVehicle } = useOpenCycles(userId);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const v = await veiculosRepo.find(id);
                setVeiculo(v?.veiculo || v);

                let tpl = await repo.findChecklist(tplId);
                // Deep-link/refresh com cache frio: o template só é populado ao
                // visitar o Index do checklist. Se ausente (ou sem itens),
                // tenta sincronizar direto do servidor antes de desistir.
                if (!tpl?.itens?.length) {
                    try {
                        await repo.syncChecklists(id);
                        tpl = await repo.findChecklist(tplId);
                    } catch (_) { /* offline/servidor indisponível — tratado abaixo */ }
                }

                if (tpl?.itens?.length) {
                    setTemplate(tpl);
                    const init = {};
                    tpl.itens.forEach((it) => {
                        init[it.id] = { ok: null, obs: '', foto_data_url: null };
                    });
                    setRespostas(init);
                } else {
                    setTemplate(null);
                    setLoadError('Este checklist ainda não está disponível neste dispositivo. Conecte-se à internet e tente novamente.');
                }
            } catch (err) {
                setLoadError(err.message || 'Falha ao carregar o checklist.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, tplId, reloadKey]);

    const setResposta = (itemId, key, value) => {
        setRespostas((r) => ({ ...r, [itemId]: { ...(r[itemId] || {}), [key]: value } }));
    };

    const handleCaptureItem = ({ dataUrl }) => {
        if (!cameraOpen) return;
        setResposta(cameraOpen, 'foto_data_url', dataUrl);
        setCameraOpen(null);
    };

    const handleSave = useCallback(async () => {
        const obrigatorios = (template?.itens || []).filter((i) => i.obrigatorio !== false);
        const naoRespondidos = obrigatorios.filter((i) => respostas[i.id]?.ok == null);
        if (naoRespondidos.length) {
            setError(`Responda os ${naoRespondidos.length} item(s) obrigatório(s).`);
            return;
        }
        // Não conformidade exige evidência: observação obrigatória
        // (o servidor valida a mesma regra — ver StoreChecklistServicoRequest).
        const semObs = (template?.itens || []).filter(
            (i) => respostas[i.id]?.ok === false && !(respostas[i.id]?.obs || '').trim()
        );
        if (semObs.length) {
            const nomes = semObs.map((i) => i.nome || i.descricao).slice(0, 3).join(', ');
            setError(`Descreva a não conformidade de: ${nomes}${semObs.length > 3 ? '…' : ''}`);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const now = nowLocalTimestamp();
            const payload = {
                veiculo_id: id,
                checklist_id: Number(tplId),
                user_id: userId,
                user_create: auth?.user?.email || '',
                template_nome: template?.nome || template?.titulo || null,
                tipo,                                        // 'ABERTURA' | 'ENCERRAMENTO'
                ciclo_status: isAbertura ? 'ABERTO' : 'FECHADO',
                data: now,
                responsavel: meta.responsavel,
                km_atual: meta.km_atual ? integerNumberValue(meta.km_atual) : null,
                hr_atual: meta.hr_atual ? integerNumberValue(meta.hr_atual) : null,
                observacao_geral: meta.observacao_geral,
                respostas: Object.entries(respostas).map(([itemId, r]) => ({
                    item_id: Number(itemId),
                    item_nome: template.itens.find((i) => i.id == itemId)?.nome,
                    ok: r.ok,
                    obs: r.obs || null,
                    foto_data_url: r.foto_data_url || null,
                })),
            };
            await repo.createServico(payload);
            router.visit(`/mobile/veiculos/${id}/checklist`);
        } catch (e) {
            setError(e.message);
            setSaving(false);
        }
    }, [respostas, meta, id, tplId, template, auth, userId, tipo, isAbertura]);

    if (loading) {
        return (
            <MobileLayout header={isAbertura ? 'Abrir Checklist' : 'Encerrar Checklist'}
                backUrl={`/mobile/veiculos/${id}/checklist`} hideBottomNav>
                <div className="p-8 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                    <p className="text-sm">Carregando…</p>
                </div>
            </MobileLayout>
        );
    }

    // Template indisponível (cache frio + sem rede): erro claro com retry,
    // em vez do antigo spinner infinito.
    if (!template) {
        return (
            <MobileLayout header={isAbertura ? 'Abrir Checklist' : 'Encerrar Checklist'}
                backUrl={`/mobile/veiculos/${id}/checklist`} hideBottomNav>
                <div className="p-4 space-y-3">
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900 text-center">
                        <i className="fa-solid fa-cloud-arrow-down text-3xl text-amber-600 mb-2" />
                        <h3 className="font-bold text-base mb-1">Checklist indisponível offline</h3>
                        <p className="text-sm leading-relaxed">
                            {loadError || 'Não foi possível carregar este checklist.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="block w-full py-2.5 bg-[#557bbb] text-white rounded-lg font-semibold text-sm text-center"
                    >
                        <i className="fa-solid fa-rotate-right mr-1" /> Tentar novamente
                    </button>
                    <Link href={`/mobile/veiculos/${id}/checklist`}
                        className="block w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm text-center">
                        Voltar
                    </Link>
                </div>
            </MobileLayout>
        );
    }

    // BLOQUEIO: apenas para ABERTURA (encerrar não bloqueia)
    if (isAbertura) {
        const blockers = getOpenInOtherVehicle(id);
        if (blockers.length > 0) {
            return (
                <MobileLayout header="Abrir Checklist" backUrl={`/mobile/veiculos/${id}/checklist`} hideBottomNav>
                    <div className="p-4 space-y-3">
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900">
                            <div className="flex items-start gap-3">
                                <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-600 mt-1" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-base mb-2">Você tem ciclo aberto em outro veículo</h3>
                                    <p className="text-sm leading-relaxed mb-3">
                                        Encerre o ciclo anterior antes de abrir um novo checklist.
                                    </p>
                                    <ul className="space-y-2">
                                        {blockers.map((b) => (
                                            <li key={`${b.kind}-${b.id}`} className="bg-white rounded-lg p-3 border border-amber-200">
                                                <p className="text-xs text-amber-700 font-semibold uppercase mb-1">
                                                    {b.kind === 'diario' ? '📓 Diário de Bordo' : '✅ Checklist'}
                                                </p>
                                                <p className="text-sm font-medium text-gray-800">Veículo: {b.prefixo}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <Link href={`/mobile/veiculos/${id}/checklist`}
                            className="block w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm text-center">
                            Voltar
                        </Link>
                    </div>
                </MobileLayout>
            );
        }
    }

    const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;
    const respondidos = Object.values(respostas).filter((r) => r.ok != null).length;
    const total = template.itens?.length || 0;

    return (
        <MobileLayout
            header={isAbertura ? `Abrir: ${template.nome}` : `Encerrar: ${template.nome}`}
            backUrl={`/mobile/veiculos/${id}/checklist`} hideBottomNav>
            <Head title={isAbertura ? 'Abrir checklist' : 'Encerrar checklist'} />

            <div className="p-3 space-y-3">
                {/* Banner do tipo */}
                <div className={`rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                    isAbertura
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-orange-50 border border-orange-200 text-orange-800'
                }`}>
                    <i className={`fa-solid ${isAbertura ? 'fa-flag' : 'fa-flag-checkered'}`} />
                    <span>{isAbertura ? 'CHECKLIST DE ABERTURA' : 'CHECKLIST DE ENCERRAMENTO'}</span>
                </div>

                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong>
                    </div>
                )}

                {/* Progresso */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600">Progresso</span>
                        <span className="text-xs font-bold text-[#557bbb]">{respondidos} / {total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#557bbb] rounded-full transition-all"
                            style={{ width: `${total > 0 ? (respondidos / total) * 100 : 0}%` }} />
                    </div>
                </div>

                {/* Meta */}
                <div className="bg-white rounded-xl p-3 shadow-sm space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data e hora</label>
                        <input type="text" readOnly value={nowLocalDMYHM()}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                        <input value={meta.responsavel}
                            onChange={(e) => setMeta((m) => ({ ...m, responsavel: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb]" />
                    </div>
                    {isMaquina ? (
                        <IntegerInput label="Horímetro atual" value={meta.hr_atual}
                            onChange={(v) => setMeta((m) => ({ ...m, hr_atual: v }))} suffix="h" />
                    ) : (
                        <IntegerInput label="Quilometragem atual" value={meta.km_atual}
                            onChange={(v) => setMeta((m) => ({ ...m, km_atual: v }))} suffix="km" />
                    )}
                </div>

                {/* Itens */}
                <div className="space-y-2">
                    {(template.itens || []).map((item, idx) => {
                        const resp = respostas[item.id] || {};
                        const valida = resp.ok === true;
                        const invalida = resp.ok === false;
                        return (
                            <div key={item.id}
                                className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${
                                    valida ? 'border-emerald-500' :
                                    invalida ? 'border-red-500' :
                                    'border-gray-200'
                                }`}>
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="text-xs text-gray-400 font-mono">{idx + 1}.</span>
                                    <p className="flex-1 text-sm font-medium text-gray-800">
                                        {item.nome || item.descricao}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button type="button"
                                        onClick={() => setResposta(item.id, 'ok', true)}
                                        className={`py-2 rounded-md font-medium text-xs transition-colors ${
                                            valida ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}>
                                        <i className="fa-solid fa-check mr-1" /> Conforme
                                    </button>
                                    <button type="button"
                                        onClick={() => setResposta(item.id, 'ok', false)}
                                        className={`py-2 rounded-md font-medium text-xs transition-colors ${
                                            invalida ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}>
                                        <i className="fa-solid fa-xmark mr-1" /> Não conforme
                                    </button>
                                </div>

                                {invalida && (
                                    <textarea rows={2} value={resp.obs || ''}
                                        onChange={(e) => setResposta(item.id, 'obs', e.target.value)}
                                        placeholder="Descreva a não conformidade… (obrigatório)"
                                        className={`w-full px-2 py-1.5 mb-2 rounded-md border text-xs resize-none focus:outline-none focus:border-red-400 ${
                                            (resp.obs || '').trim() ? 'border-gray-200' : 'border-red-300 bg-red-50/50'
                                        }`} />
                                )}

                                {/* Foto do item */}
                                <div className="flex items-center gap-2">
                                    {resp.foto_data_url ? (
                                        <div className="relative inline-block">
                                            <img src={resp.foto_data_url} alt="Foto"
                                                className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                                            <button type="button"
                                                onClick={() => setResposta(item.id, 'foto_data_url', null)}
                                                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] shadow">
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        </div>
                                    ) : null}
                                    <button type="button"
                                        onClick={() => setCameraOpen(item.id)}
                                        className="px-3 py-1.5 bg-[#557bbb] hover:bg-[#3a5a8c] text-white rounded-md text-xs font-medium flex items-center gap-1">
                                        <i className="fa-solid fa-camera" />
                                        {resp.foto_data_url ? 'Trocar foto' : 'Tirar foto'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Observação geral */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observação geral</label>
                    <textarea rows={3} value={meta.observacao_geral}
                        onChange={(e) => setMeta((m) => ({ ...m, observacao_geral: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb] resize-none" />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <button onClick={() => router.visit(`/mobile/veiculos/${id}/checklist`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className={`flex-1 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 text-white ${
                            isAbertura ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
                        }`}>
                        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Salvando…</>
                                : isAbertura
                                    ? <><i className="fa-solid fa-flag mr-1" /> Abrir Checklist</>
                                    : <><i className="fa-solid fa-flag-checkered mr-1" /> Encerrar Checklist</>}
                    </button>
                </div>

                {isAbertura && (
                    /* Aviso do ciclo em destaque (mesma regra do diário de bordo) */
                    <div className="flex items-start gap-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
                        <i className="fa-solid fa-triangle-exclamation text-amber-500 text-2xl mt-0.5 shrink-0" />
                        <p className="text-sm font-semibold text-amber-900 leading-snug">
                            Após abrir, você precisará <span className="font-extrabold underline">ENCERRAR este checklist</span> antes
                            de iniciar outro em qualquer veículo.
                        </p>
                    </div>
                )}
            </div>

            <CameraCapture
                isOpen={!!cameraOpen}
                onClose={() => setCameraOpen(null)}
                onCapture={handleCaptureItem}
                title={cameraOpen ? `Foto do item` : ''}
                quality={0.7}
                maxDimension={1600}
            />
        </MobileLayout>
    );
}
