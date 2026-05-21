// resources/js/Pages/Mobile/Veiculos/Abastecimento/Edit.jsx
import { useEffect, useState, useCallback } from 'react';
import { router, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/abastecimentosRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';

const COMBUSTIVEIS = ['Diesel S10', 'Diesel S500', 'Gasolina', 'Etanol', 'GNV', 'Arla 32'];

export default function AbastecimentoEdit({ veiculoId, abastecimentoId }) {
    const parts = window.location.pathname.split('/');
    const id = veiculoId || parts[parts.indexOf('veiculos') + 1];
    const aId = abastecimentoId || parts[parts.indexOf('abastecimentos') + 1];

    const [veiculo, setVeiculo] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            const v = await veiculosRepo.find(id);
            setVeiculo(v?.veiculo);
            const a = await repo.find(aId);
            if (a) {
                setForm({
                    ...a,
                    data: a.data ? new Date(a.data).toISOString().slice(0, 16) : '',
                });
            } else {
                setError('Registro não encontrado no cache local.');
            }
        })();
    }, [id, aId]);

    const handleChange = (field, value) => {
        setForm((f) => {
            const next = { ...f, [field]: value };
            if (field === 'quantidade' || field === 'valor_do_litro') {
                const q = parseFloat(next.quantidade) || 0;
                const vv = parseFloat(next.valor_do_litro) || 0;
                if (q && vv) next.valor_total = (q * vv).toFixed(2);
            }
            return next;
        });
    };

    const handleSave = useCallback(async () => {
        setSaving(true); setError(null);
        try {
            const payload = {
                data: form.data,
                fornecedor: form.fornecedor,
                combustivel: form.combustivel,
                quantidade: parseFloat(form.quantidade) || 0,
                valor_do_litro: parseFloat(form.valor_do_litro) || 0,
                valor_total: parseFloat(form.valor_total) || 0,
                km_atual: form.km_atual ? parseFloat(form.km_atual) : null,
                hr_atual: form.hr_atual ? parseFloat(form.hr_atual) : null,
                observacao: form.observacao,
            };
            await repo.update(aId, payload);
            router.visit(`/mobile/veiculos/${id}/abastecimentos`);
        } catch (e) {
            setError(e.message);
            setSaving(false);
        }
    }, [form, aId, id]);

    if (!form) {
        return (
            <MobileLayout header="Carregando…" backUrl={`/mobile/veiculos/${id}/abastecimentos`}>
                <div className="text-center py-12 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl" />
                    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
                </div>
            </MobileLayout>
        );
    }

    const isMaquina = veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header="Editar abastecimento" backUrl={`/mobile/veiculos/${id}/abastecimentos`} hideBottomNav>
            <Head title="Editar abastecimento" />
            <div className="p-3 space-y-3">
                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                        {error}
                    </div>
                )}
                <Field label="Data e hora">
                    <input type="datetime-local" value={form.data || ''}
                        onChange={(e) => handleChange('data', e.target.value)} className="input" />
                </Field>
                <Field label="Fornecedor / Posto">
                    <input value={form.fornecedor || ''}
                        onChange={(e) => handleChange('fornecedor', e.target.value)} className="input" />
                </Field>
                <Field label="Combustível">
                    <select value={form.combustivel || ''}
                        onChange={(e) => handleChange('combustivel', e.target.value)} className="input">
                        {COMBUSTIVEIS.map(c => <option key={c}>{c}</option>)}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Quantidade (L)">
                        <input type="number" step="0.01" value={form.quantidade || ''}
                            onChange={(e) => handleChange('quantidade', e.target.value)} className="input" />
                    </Field>
                    <Field label="Valor/L (R$)">
                        <input type="number" step="0.001" value={form.valor_do_litro || ''}
                            onChange={(e) => handleChange('valor_do_litro', e.target.value)} className="input" />
                    </Field>
                </div>
                <Field label="Valor total (R$)">
                    <input type="number" step="0.01" value={form.valor_total || ''}
                        onChange={(e) => handleChange('valor_total', e.target.value)} className="input" />
                </Field>
                {isMaquina ? (
                    <Field label="Horímetro atual">
                        <input type="number" step="0.1" value={form.hr_atual || ''}
                            onChange={(e) => handleChange('hr_atual', e.target.value)} className="input" />
                    </Field>
                ) : (
                    <Field label="Quilometragem atual">
                        <input type="number" value={form.km_atual || ''}
                            onChange={(e) => handleChange('km_atual', e.target.value)} className="input" />
                    </Field>
                )}
                <Field label="Observação">
                    <textarea rows={3} value={form.observacao || ''}
                        onChange={(e) => handleChange('observacao', e.target.value)} className="input" />
                </Field>
                <div className="flex gap-2 pt-2">
                    <button onClick={() => router.visit(`/mobile/veiculos/${id}/abastecimentos`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-[#557bbb] text-white rounded-lg font-semibold text-sm disabled:opacity-60">
                        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" /> Salvando…</>
                                : <><i className="fa-solid fa-save mr-1" /> Salvar</>}
                    </button>
                </div>
            </div>

            <style>{`.input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; background: white; }
                     .input:focus { outline: none; border-color: #557bbb; box-shadow: 0 0 0 1px #557bbb; }`}</style>
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
