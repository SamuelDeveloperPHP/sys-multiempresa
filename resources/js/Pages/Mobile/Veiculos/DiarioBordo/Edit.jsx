// resources/js/Pages/Mobile/Veiculos/DiarioBordo/Edit.jsx
import { useEffect, useState, useCallback } from 'react';
import { router, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import { toDatetimeLocalValue } from '@/utils/datetime';
import repo from '@/offline/repositories/diarioBordoRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';

export default function DiarioBordoEdit({ veiculoId, diarioId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const dId = diarioId || parts[parts.indexOf('diario-bordo') + 1];

    const [veiculo, setVeiculo] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            const v = await veiculosRepo.find(id);
            setVeiculo(v?.veiculo);
            const d = await repo.find(dId);
            if (d) setForm({ ...d, data: toDatetimeLocalValue(d.data) });
            else setError('Registro não encontrado.');
        })();
    }, [id, dId]);

    const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = useCallback(async () => {
        setSaving(true); setError(null);
        try {
            const payload = {
                ...form,
                km_inicial: form.km_inicial ? parseFloat(form.km_inicial) : null,
                km_final:   form.km_final   ? parseFloat(form.km_final)   : null,
                hr_inicial: form.hr_inicial ? parseFloat(form.hr_inicial) : null,
                hr_final:   form.hr_final   ? parseFloat(form.hr_final)   : null,
            };
            await repo.update(dId, payload);
            router.visit(`/mobile/veiculos/${id}/diario-bordo`);
        } catch (e) {
            setError(e.message); setSaving(false);
        }
    }, [form, id, dId]);

    if (!form) {
        return (
            <MobileLayout header="Carregando…" backUrl={`/mobile/veiculos/${id}/diario-bordo`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
                </div>
            </MobileLayout>
        );
    }

    const isMaquina = veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header="Editar diário" backUrl={`/mobile/veiculos/${id}/diario-bordo`} hideBottomNav>
            <Head title="Editar diário" />
            <div className="p-3 space-y-3">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">{error}</div>}

                <Field label="Data e hora">
                    <input type="datetime-local" value={form.data || ''}
                        onChange={(e) => handleChange('data', e.target.value)} className="input" />
                </Field>
                {/* Responsável é definido pelo servidor (quem abriu o diário) e
                    imutável pelo app — só o administrador ajusta, no painel web. */}
                <Field label="Responsável 🔒">
                    <input value={form.responsavel || ''} readOnly
                        className="input bg-gray-50 text-gray-600 cursor-not-allowed" />
                </Field>

                {isMaquina ? (
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Horímetro inicial">
                            <input type="number" step="0.1" value={form.hr_inicial || ''}
                                onChange={(e) => handleChange('hr_inicial', e.target.value)} className="input" />
                        </Field>
                        <Field label="Horímetro final">
                            <input type="number" step="0.1" value={form.hr_final || ''}
                                onChange={(e) => handleChange('hr_final', e.target.value)} className="input" />
                        </Field>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="KM inicial">
                            <input type="number" value={form.km_inicial || ''}
                                onChange={(e) => handleChange('km_inicial', e.target.value)} className="input" />
                        </Field>
                        <Field label="KM final">
                            <input type="number" value={form.km_final || ''}
                                onChange={(e) => handleChange('km_final', e.target.value)} className="input" />
                        </Field>
                    </div>
                )}

                <Field label="Descrição / Relato">
                    <textarea rows={6} value={form.descricao || ''}
                        onChange={(e) => handleChange('descricao', e.target.value)} className="input" />
                </Field>
                <Field label="Observação">
                    <textarea rows={3} value={form.observacao || ''}
                        onChange={(e) => handleChange('observacao', e.target.value)} className="input" />
                </Field>

                <div className="flex gap-2 pt-2">
                    <button onClick={() => router.visit(`/mobile/veiculos/${id}/diario-bordo`)}
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

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            {children}
        </div>
    );
}
