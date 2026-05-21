// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Create.jsx
import { useEffect, useState, useCallback } from 'react';
import { router, Head, usePage } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/diarioBordoRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';

export default function DiarioBordoCreate({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[2];
    const { auth } = usePage().props;
    const [veiculo, setVeiculo] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        veiculo_id: Number(id),
        data: new Date().toISOString().slice(0, 16),
        responsavel: auth?.user?.name || '',
        km_inicial: '',
        km_final: '',
        hr_inicial: '',
        hr_final: '',
        descricao: '',
        observacao: '',
    });

    useEffect(() => {
        (async () => {
            const v = await veiculosRepo.find(id);
            setVeiculo(v?.veiculo);
        })();
    }, [id]);

    const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const validate = () => {
        if (!form.data) return 'Informe a data.';
        if (!form.descricao || form.descricao.trim().length < 3) return 'Descreva o registro (mínimo 3 caracteres).';
        return null;
    };

    const handleSave = useCallback(async () => {
        const err = validate(); if (err) { setError(err); return; }
        setError(null); setSaving(true);
        try {
            const payload = {
                ...form,
                km_inicial: form.km_inicial ? parseFloat(form.km_inicial) : null,
                km_final:   form.km_final   ? parseFloat(form.km_final)   : null,
                hr_inicial: form.hr_inicial ? parseFloat(form.hr_inicial) : null,
                hr_final:   form.hr_final   ? parseFloat(form.hr_final)   : null,
            };
            await repo.create(payload);
            router.visit(`/mobile/veiculos/${id}/diario-bordo`);
        } catch (e) {
            setError(e.message); setSaving(false);
        }
    }, [form, id]);

    const isMaquina = veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header="Novo registro no diário" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
            <Head title="Novo diário" />
            <div className="p-3 space-y-3">
                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">{error}</div>
                )}

                <Field label="Data e hora" required>
                    <input type="datetime-local" value={form.data}
                        onChange={(e) => handleChange('data', e.target.value)} className="input" />
                </Field>
                <Field label="Responsável (motorista/operador)">
                    <input value={form.responsavel}
                        onChange={(e) => handleChange('responsavel', e.target.value)} className="input" />
                </Field>

                {isMaquina ? (
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Horímetro inicial">
                            <input type="number" step="0.1" value={form.hr_inicial}
                                onChange={(e) => handleChange('hr_inicial', e.target.value)} className="input" />
                        </Field>
                        <Field label="Horímetro final">
                            <input type="number" step="0.1" value={form.hr_final}
                                onChange={(e) => handleChange('hr_final', e.target.value)} className="input" />
                        </Field>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="KM inicial">
                            <input type="number" value={form.km_inicial}
                                onChange={(e) => handleChange('km_inicial', e.target.value)} className="input" />
                        </Field>
                        <Field label="KM final">
                            <input type="number" value={form.km_final}
                                onChange={(e) => handleChange('km_final', e.target.value)} className="input" />
                        </Field>
                    </div>
                )}

                <Field label="Descrição / Relato" required>
                    <textarea rows={6} value={form.descricao}
                        onChange={(e) => handleChange('descricao', e.target.value)}
                        placeholder="O que aconteceu? Ex: serviço de transporte para a obra X…"
                        className="input" />
                </Field>

                <Field label="Observação">
                    <textarea rows={3} value={form.observacao}
                        onChange={(e) => handleChange('observacao', e.target.value)} className="input" />
                </Field>

                <div className="flex gap-2 pt-2">
                    <button onClick={() => router.visit(`/mobile/veiculos/${id}/diario-bordo`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-[#2ecc71] text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Salvando…</>
                                : <><i className="fa-solid fa-save mr-1" /> Salvar localmente</>}
                    </button>
                </div>
            </div>
            <style>{`.input{width:100%;padding:.55rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.875rem;background:white}.input:focus{outline:none;border-color:#557bbb;box-shadow:0 0 0 1px #557bbb}`}</style>
        </MobileLayout>
    );
}

function Field({ label, required, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}
