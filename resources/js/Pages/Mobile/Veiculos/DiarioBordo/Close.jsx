// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Close.jsx
// -----------------------------------------------------------------------------
// FECHAMENTO de Diário de Bordo — registra km/hr final + observação + foto.
//
// REGRAS:
//   - Só funciona para diários com ciclo_status: 'ABERTO'
//   - km_final >= km_inicial (não retrocede)
//   - hr_final >= hr_inicial
//   - Após fechar, motorista pode abrir novo diário em qualquer veículo
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { router, Head, usePage, Link } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/diarioBordoRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import IntegerInput from '@/Components/Mobile/IntegerInput';
import CameraCapture from '@/Components/Mobile/CameraCapture';
import { integerNumberValue } from '@/utils/numberInput';
import { nowLocalDMYHM, nowLocalTimestamp } from '@/utils/datetime';

export default function DiarioBordoClose({ veiculoId, diarioId }) {
    const segments = window.location.pathname.split('/');
    const id = Number(veiculoId || segments[3]);
    const dId = diarioId || segments[5];

    const { auth } = usePage().props;

    const [diario, setDiario] = useState(null);
    const [veiculo, setVeiculo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);

    const [form, setForm] = useState({
        km_final: '',
        hr_final: '',
        observacao_fechamento: '',
        arquivo_fechamento: null,
    });

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const v = await veiculosRepo.find(id);
                setVeiculo(v?.veiculo || v);

                const d = await repo.find(dId);
                if (!d) {
                    setError('Diário não encontrado.');
                    return;
                }
                if (d.ciclo_status === 'FECHADO') {
                    setError('Este diário já está FECHADO.');
                }
                setDiario(d);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, dId]);

    const handleField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const handleCapture = ({ dataUrl, blob, width, height }) => {
        setForm((f) => ({
            ...f,
            arquivo_fechamento: { dataUrl, width, height, size: blob.size },
        }));
        setCameraOpen(false);
    };

    const validate = () => {
        const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;
        if (isMaquina) {
            const hrFinal = integerNumberValue(form.hr_final);
            const hrInicial = integerNumberValue(diario?.hr_inicial);
            if (!hrFinal) return 'Informe o horímetro final.';
            if (hrFinal < hrInicial) {
                return `Horímetro final (${hrFinal}h) não pode ser menor que o inicial (${hrInicial}h).`;
            }
        } else {
            const kmFinal = integerNumberValue(form.km_final);
            const kmInicial = integerNumberValue(diario?.km_inicial);
            if (!kmFinal) return 'Informe a quilometragem final.';
            if (kmFinal < kmInicial) {
                return `Hodômetro final (${kmFinal} km) não pode ser menor que o inicial (${kmInicial} km).`;
            }
        }
        return null;
    };

    const handleClose = useCallback(async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError(null);
        setSaving(true);

        try {
            const now = nowLocalTimestamp();
            const payload = {
                ciclo_status: 'FECHADO',
                horario_final: now,
                user_edit: auth?.user?.email || '',
                km_final: form.km_final ? integerNumberValue(form.km_final) : null,
                hr_final: form.hr_final ? integerNumberValue(form.hr_final) : null,
                observacao_fechamento: form.observacao_fechamento || '',
                arquivo_fechamento_data_url: form.arquivo_fechamento?.dataUrl || null,
            };
            await repo.update(diario.id, payload);
            router.visit(`/mobile/veiculos/${id}/diario-bordo`);
        } catch (e) {
            setError(e.message || 'Erro ao fechar.');
            setSaving(false);
        }
    }, [form, diario, id, veiculo, auth]);

    if (loading) {
        return (
            <MobileLayout header="Fechar Diário" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
                <div className="p-8 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                </div>
            </MobileLayout>
        );
    }

    if (!diario || diario.ciclo_status === 'FECHADO') {
        return (
            <MobileLayout header="Fechar Diário" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
                <div className="p-4 space-y-3">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                        {error || 'Este diário não pode ser fechado.'}
                    </div>
                    <Link href={`/mobile/veiculos/${id}/diario-bordo`}
                        className="block w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm text-center">
                        Voltar
                    </Link>
                </div>
            </MobileLayout>
        );
    }

    const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header="Fechar Diário de Bordo" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
            <Head title="Fechar diário" />

            <div className="p-3 space-y-4">
                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong>
                    </div>
                )}

                {/* Resumo da abertura */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold mb-1">📓 Abertura</p>
                    {diario.horario_inicial && <p>Iniciado: <strong>{diario.horario_inicial}</strong></p>}
                    {isMaquina && diario.hr_inicial && <p>Horímetro inicial: <strong>{diario.hr_inicial}h</strong></p>}
                    {!isMaquina && diario.km_inicial && <p>Hodômetro inicial: <strong>{diario.km_inicial} km</strong></p>}
                    {diario.descricao_atividade && <p className="mt-1">Atividade: {diario.descricao_atividade}</p>}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data e horário final</label>
                    <input type="text" readOnly value={nowLocalDMYHM()}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm cursor-not-allowed" />
                </div>

                {isMaquina ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <IntegerInput label="Horímetro Final" required
                            value={form.hr_final} onChange={(v) => handleField('hr_final', v)}
                            suffix="h" placeholder={String(diario.hr_inicial || 0)} />
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <IntegerInput label="Quilometragem Final" required
                            value={form.km_final} onChange={(v) => handleField('km_final', v)}
                            suffix="km" placeholder={String(diario.km_inicial || 0)} />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações do fechamento</label>
                    <textarea rows={4} value={form.observacao_fechamento}
                        onChange={(e) => handleField('observacao_fechamento', e.target.value)}
                        placeholder="Observações sobre a operação realizada (opcional)…"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb] resize-none" />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Foto do fechamento (opcional)</label>
                    {form.arquivo_fechamento?.dataUrl ? (
                        <div className="relative">
                            <img src={form.arquivo_fechamento.dataUrl} alt="Foto" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
                            <button type="button"
                                onClick={() => setForm((f) => ({ ...f, arquivo_fechamento: null }))}
                                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                                <i className="fa-solid fa-trash text-xs" />
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setCameraOpen(true)}
                            className="w-full py-3 border-2 border-dashed border-[#e67e22] text-[#e67e22] rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
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
                    <button type="button" onClick={handleClose} disabled={saving}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Fechando…</>
                                : <><i className="fa-solid fa-flag-checkered mr-1" /> Fechar Diário</>}
                    </button>
                </div>
            </div>

            <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)}
                onCapture={handleCapture} title="Foto do fechamento" quality={0.7} maxDimension={1920} />
        </MobileLayout>
    );
}
