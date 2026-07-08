// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Create.jsx
// -----------------------------------------------------------------------------
// ABERTURA de Diário de Bordo — port das regras do legado.
//
// REGRAS:
//   - Salva com ciclo_status: 'ABERTO'
//   - BLOQUEIA abertura se já há diário ABERTO em OUTRO veículo
//   - Campos da abertura: km/hr INICIAL + descrição + foto câmera
//   - Foto é opcional na abertura (segue legado)
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { router, Head, usePage, Link } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/diarioBordoRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import IntegerInput from '@/Components/Mobile/IntegerInput';
import CameraCapture from '@/Components/Mobile/CameraCapture';
import useOpenCycles from '@/offline/hooks/useOpenCycles';
import { integerNumberValue } from '@/utils/numberInput';
import { nowLocalDMYHM, nowLocalTimestamp } from '@/utils/datetime';

export default function DiarioBordoCreate({ veiculoId }) {
    const id = Number(veiculoId || window.location.pathname.split('/').reverse()[2]);
    const { auth } = usePage().props;
    const userId = auth?.user?.id;

    const [veiculo, setVeiculo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [valoresAnteriores, setValoresAnteriores] = useState({ km: 0, hr: 0 });

    const { hasOpenInOtherVehicle, getOpenInOtherVehicle } = useOpenCycles(userId);

    const [form, setForm] = useState({
        veiculo_id: id,
        km_inicial: '',
        hr_inicial: '',
        descricao_atividade: '',
        arquivo_app: null,
    });

    // Carrega veículo e calcula valores anteriores (último diário)
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const v = await veiculosRepo.find(id);
                const veiculoData = v?.veiculo || v;
                setVeiculo(veiculoData);

                const lista = await repo.listByVeiculo(id);
                const ult = lista?.[0];

                setValoresAnteriores({
                    km: integerNumberValue(ult?.km_final || ult?.km_inicial || 0),
                    hr: integerNumberValue(ult?.hr_final || ult?.hr_inicial || 0),
                });
            } catch (err) {
                console.error('Erro:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleField = (field, value) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    const handleCapture = ({ dataUrl, blob, width, height }) => {
        setForm((f) => ({
            ...f,
            arquivo_app: { dataUrl, width, height, size: blob.size },
        }));
        setCameraOpen(false);
    };

    const validate = () => {
        if (!form.descricao_atividade.trim() || form.descricao_atividade.trim().length < 3) {
            return 'Descreva a atividade (mínimo 3 caracteres).';
        }
        const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;
        if (isMaquina && !form.hr_inicial) {
            return 'Informe o horímetro inicial.';
        }
        if (!isMaquina && !form.km_inicial) {
            return 'Informe a quilometragem inicial.';
        }
        return null;
    };

    const handleSave = useCallback(async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError(null);
        setSaving(true);

        try {
            const now = nowLocalTimestamp();
            const payload = {
                veiculo_id: id,
                user_id: userId,
                user_create: auth?.user?.email || '',
                data: now,
                horario_inicial: now,
                ciclo_status: 'ABERTO',
                km_inicial: form.km_inicial ? integerNumberValue(form.km_inicial) : null,
                km_anterior: valoresAnteriores.km || null,
                hr_inicial: form.hr_inicial ? integerNumberValue(form.hr_inicial) : null,
                hr_anterior: valoresAnteriores.hr || null,
                descricao_atividade: form.descricao_atividade.trim(),
                arquivo_app_data_url: form.arquivo_app?.dataUrl || null,
            };
            await repo.create(payload);
            router.visit(`/mobile/veiculos/${id}/diario-bordo`);
        } catch (e) {
            setError(e.message || 'Erro ao salvar.');
            setSaving(false);
        }
    }, [form, id, userId, auth, valoresAnteriores]);

    if (loading) {
        return (
            <MobileLayout header="Abrir Diário" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
                <div className="p-8 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                    <p className="text-sm">Carregando…</p>
                </div>
            </MobileLayout>
        );
    }

    // BLOQUEIO: se há diário/checklist aberto em outro veículo, mostra aviso
    const blockers = getOpenInOtherVehicle(id);
    if (blockers.length > 0) {
        return (
            <MobileLayout header="Abrir Diário" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
                <Head title="Abrir Diário" />
                <div className="p-4 space-y-3">
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900">
                        <div className="flex items-start gap-3">
                            <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-600 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-bold text-base mb-2">Você tem ciclo aberto em outro veículo</h3>
                                <p className="text-sm leading-relaxed mb-3">
                                    Não é possível abrir um novo diário enquanto há outro ABERTO. Feche o ciclo anterior primeiro.
                                </p>
                                <ul className="space-y-2">
                                    {blockers.map((b) => (
                                        <li key={`${b.kind}-${b.id}`} className="bg-white rounded-lg p-3 border border-amber-200">
                                            <p className="text-xs text-amber-700 font-semibold uppercase mb-1">
                                                📓 Diário de Bordo
                                            </p>
                                            <p className="text-sm font-medium text-gray-800">
                                                Veículo: {b.prefixo}
                                            </p>
                                            {b.kind === 'diario' && (
                                                <Link
                                                    href={`/mobile/veiculos/${b.veiculo_id}/diario-bordo/${b.id}/close`}
                                                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md"
                                                >
                                                    <i className="fa-solid fa-flag-checkered" />
                                                    Ir para fechar
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <Link
                        href={`/mobile/veiculos/${id}/diario-bordo`}
                        className="block w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm text-center"
                    >
                        Voltar
                    </Link>
                </div>
            </MobileLayout>
        );
    }

    const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header="Abrir Diário de Bordo" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
            <Head title="Abrir diário de bordo" />

            <div className="p-3 space-y-4">
                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong>
                        {veiculo.marca && ` — ${veiculo.marca}`}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data e horário inicial</label>
                    <input type="text" readOnly value={nowLocalDMYHM()}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm cursor-not-allowed" />
                </div>

                {/* Responsável = usuário logado. Somente-leitura: o servidor define
                    o valor pelo usuário autenticado (só o admin pode ajustar). */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Responsável
                        <i className="fa-solid fa-lock ml-1 text-gray-400" title="Definido automaticamente" />
                    </label>
                    <input type="text" readOnly value={auth?.user?.name || ''}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm cursor-not-allowed" />
                </div>

                {isMaquina ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                            <i className="fa-solid fa-gauge" />
                            <span>Horímetro</span>
                        </div>
                        <IntegerInput label="Horímetro Inicial" required
                            value={form.hr_inicial} onChange={(v) => handleField('hr_inicial', v)}
                            suffix="h" placeholder={String(valoresAnteriores.hr || 0)} />
                        {valoresAnteriores.hr > 0 && (
                            <p className="text-[11px] text-amber-700">
                                Anterior: {valoresAnteriores.hr}h
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2 text-blue-800 text-xs font-semibold">
                            <i className="fa-solid fa-road" />
                            <span>Quilometragem</span>
                        </div>
                        <IntegerInput label="Quilometragem Inicial" required
                            value={form.km_inicial} onChange={(v) => handleField('km_inicial', v)}
                            suffix="km" placeholder={String(valoresAnteriores.km || 0)} />
                        {valoresAnteriores.km > 0 && (
                            <p className="text-[11px] text-blue-700">
                                Anterior: {valoresAnteriores.km} km
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Descrição da Atividade <span className="text-red-500">*</span>
                    </label>
                    <textarea rows={5} value={form.descricao_atividade}
                        onChange={(e) => handleField('descricao_atividade', e.target.value)}
                        placeholder="Descreva a atividade que será realizada…"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb] resize-none" />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Foto da abertura (opcional)</label>
                    {form.arquivo_app?.dataUrl ? (
                        <div className="relative">
                            <img src={form.arquivo_app.dataUrl} alt="Foto" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
                            <button type="button"
                                onClick={() => setForm((f) => ({ ...f, arquivo_app: null }))}
                                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                                <i className="fa-solid fa-trash text-xs" />
                            </button>
                            <button type="button" onClick={() => setCameraOpen(true)}
                                className="absolute bottom-2 right-2 w-10 h-10 flex items-center justify-center rounded-full bg-[#557bbb] text-white shadow-lg">
                                <i className="fa-solid fa-camera-rotate" />
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setCameraOpen(true)}
                            className="w-full py-3 border-2 border-dashed border-[#e67e22] text-[#e67e22] rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                            <i className="fa-solid fa-camera text-lg" />
                            Tirar Foto
                        </button>
                    )}
                </div>

                <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => router.visit(`/mobile/veiculos/${id}/diario-bordo`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Salvando…</>
                                : <><i className="fa-solid fa-play mr-1" /> Abrir Diário</>}
                    </button>
                </div>

                {/* Aviso do ciclo em destaque: regra operacional que o motorista
                    precisa LER antes de abrir (abertura obriga encerramento). */}
                <div className="flex items-start gap-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
                    <i className="fa-solid fa-triangle-exclamation text-amber-500 text-2xl mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold text-amber-900 leading-snug">
                        Após abrir, você precisará <span className="font-extrabold underline">FECHAR este diário</span> antes
                        de abrir outro em qualquer veículo.
                    </p>
                </div>
            </div>

            <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)}
                onCapture={handleCapture} title="Foto da abertura" quality={0.7} maxDimension={1920} />
        </MobileLayout>
    );
}
