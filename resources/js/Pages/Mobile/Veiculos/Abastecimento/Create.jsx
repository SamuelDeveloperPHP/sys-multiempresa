// resources/js/Pages/Mobile/Veiculos/Abastecimento/Create.jsx
import { useEffect, useState, useCallback } from 'react';
import { router, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/abastecimentosRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';

const COMBUSTIVEIS = ['Diesel S10', 'Diesel S500', 'Gasolina', 'Etanol', 'GNV', 'Arla 32'];

export default function AbastecimentoCreate({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[2];
    const [veiculo, setVeiculo] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        veiculo_id: Number(id),
        data: new Date().toISOString().slice(0, 16),
        fornecedor: '',
        combustivel: 'Diesel S10',
        quantidade: '',
        valor_do_litro: '',
        valor_total: '',
        km_atual: '',
        hr_atual: '',
        observacao: '',
    });

    useEffect(() => {
        (async () => {
            const v = await veiculosRepo.find(id);
            setVeiculo(v?.veiculo);
        })();
    }, [id]);

    const handleChange = (field, value) => {
        setForm((f) => {
            const next = { ...f, [field]: value };
            // Auto-cálculo valor_total = quantidade * valor_do_litro
            if (field === 'quantidade' || field === 'valor_do_litro') {
                const q = parseFloat(next.quantidade) || 0;
                const v = parseFloat(next.valor_do_litro) || 0;
                if (q && v) next.valor_total = (q * v).toFixed(2);
            }
            return next;
        });
    };

    const validate = () => {
        if (!form.data) return 'Informe a data.';
        if (!form.quantidade || parseFloat(form.quantidade) <= 0) return 'Informe a quantidade.';
        if (!form.valor_total || parseFloat(form.valor_total) <= 0) return 'Informe o valor total.';
        if (veiculo?.tipo_hr == 1 && !form.hr_atual) return 'Informe o horímetro atual.';
        if (veiculo?.tipo_hr != 1 && !form.km_atual) return 'Informe a quilometragem atual.';
        return null;
    };

    const handleSave = useCallback(async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError(null);
        setSaving(true);
        try {
            const payload = {
                ...form,
                quantidade: parseFloat(form.quantidade) || 0,
                valor_do_litro: parseFloat(form.valor_do_litro) || 0,
                valor_total: parseFloat(form.valor_total) || 0,
                km_atual: form.km_atual ? parseFloat(form.km_atual) : null,
                hr_atual: form.hr_atual ? parseFloat(form.hr_atual) : null,
            };
            await repo.create(payload);
            router.visit(`/mobile/veiculos/${id}/abastecimentos`);
        } catch (e) {
            setError(e.message || 'Erro ao salvar.');
            setSaving(false);
        }
    }, [form, id, veiculo]);

    const isMaquina = veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header={`Novo abastecimento`} backUrl={`/mobile/veiculos/${id}/abastecimentos`} hideBottomNav>
            <Head title="Novo abastecimento" />

            <div className="p-3 space-y-3">
                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong> — {veiculo.marca} {veiculo.modelo}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
                    </div>
                )}

                <Field label="Data e hora" required>
                    <input
                        type="datetime-local"
                        value={form.data}
                        onChange={(e) => handleChange('data', e.target.value)}
                        className="input"
                    />
                </Field>

                <Field label="Fornecedor / Posto">
                    <input
                        type="text"
                        value={form.fornecedor}
                        onChange={(e) => handleChange('fornecedor', e.target.value)}
                        placeholder="Ex: Posto Shell BR-101"
                        className="input"
                    />
                </Field>

                <Field label="Combustível" required>
                    <select
                        value={form.combustivel}
                        onChange={(e) => handleChange('combustivel', e.target.value)}
                        className="input"
                    >
                        {COMBUSTIVEIS.map(c => <option key={c}>{c}</option>)}
                    </select>
                </Field>

                <div className="grid grid-cols-2 gap-2">
                    <Field label="Quantidade (L)" required>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={form.quantidade}
                            onChange={(e) => handleChange('quantidade', e.target.value)}
                            className="input"
                        />
                    </Field>
                    <Field label="Valor/L (R$)">
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.001"
                            value={form.valor_do_litro}
                            onChange={(e) => handleChange('valor_do_litro', e.target.value)}
                            className="input"
                        />
                    </Field>
                </div>

                <Field label="Valor total (R$)" required>
                    <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={form.valor_total}
                        onChange={(e) => handleChange('valor_total', e.target.value)}
                        className="input"
                    />
                </Field>

                {isMaquina ? (
                    <Field label="Horímetro atual" required>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value={form.hr_atual}
                            onChange={(e) => handleChange('hr_atual', e.target.value)}
                            className="input"
                        />
                    </Field>
                ) : (
                    <Field label="Quilometragem atual" required>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={form.km_atual}
                            onChange={(e) => handleChange('km_atual', e.target.value)}
                            className="input"
                        />
                    </Field>
                )}

                <Field label="Observação">
                    <textarea
                        rows={3}
                        value={form.observacao}
                        onChange={(e) => handleChange('observacao', e.target.value)}
                        className="input"
                    />
                </Field>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={() => router.visit(`/mobile/veiculos/${id}/abastecimentos`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-[#e67e22] text-white rounded-lg font-semibold text-sm disabled:opacity-60"
                    >
                        {saving ? (
                            <><i className="fa-solid fa-spinner fa-spin mr-1" /> Salvando…</>
                        ) : (
                            <><i className="fa-solid fa-save mr-1" /> Salvar localmente</>
                        )}
                    </button>
                </div>

                <p className="text-[11px] text-gray-400 text-center pt-1">
                    <i className="fa-solid fa-circle-info mr-1" />
                    Os dados são salvos no celular. Toque em "Sincronizar agora" no menu superior para enviá-los ao servidor.
                </p>
            </div>

            <style>{`.input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; background: white; }
                     .input:focus { outline: none; border-color: #557bbb; box-shadow: 0 0 0 1px #557bbb; }`}</style>
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
