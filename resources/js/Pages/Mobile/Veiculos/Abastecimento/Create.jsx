// resources/js/Pages/Mobile/Veiculos/Abastecimento/Create.jsx
// -----------------------------------------------------------------------------
// Cadastro de Abastecimento — port das regras do legado (engeativos RN).
//
// CARACTERÍSTICAS:
//   - Máscara BRL (R$ X,YZ) em valor_do_litro e valor_total
//   - Máscara decimal (123,7) em quantidade de litros
//   - Máscara integer pura em km/hr atual (não aceita separador algum)
//   - Cálculo automático: valor_total = quantidade × valor_do_litro
//   - Câmera-only para foto do comprovante (CameraCapture sem fallback de galeria)
//   - Validações do legado:
//       * km_atual >= km_anterior
//       * hr_atual >= hr_anterior
//   - Hodômetro/horímetro anterior calculado do último abastecimento
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { router, Head } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import repo from '@/offline/repositories/abastecimentosRepo';
import veiculosRepo from '@/offline/repositories/veiculosRepo';
import MoneyInput from '@/Components/Mobile/MoneyInput';
import DecimalInput from '@/Components/Mobile/DecimalInput';
import IntegerInput from '@/Components/Mobile/IntegerInput';
import CameraCapture from '@/Components/Mobile/CameraCapture';
import {
    currencyToNumber,
    decimalToNumber,
    integerNumberValue,
    formatBRL,
} from '@/utils/numberInput';
import { nowLocalDMYHM, nowLocalTimestamp } from '@/utils/datetime';

const COMBUSTIVEIS = ['Diesel S10', 'Diesel S500', 'Gasolina', 'Etanol', 'GNV', 'Arla 32'];

export default function AbastecimentoCreate({ veiculoId }) {
    const id = veiculoId || window.location.pathname.split('/').reverse()[2];
    const [veiculo, setVeiculo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [valoresAnteriores, setValoresAnteriores] = useState({ km: 0, hr: 0 });

    const [form, setForm] = useState({
        veiculo_id: Number(id),
        data: nowLocalTimestamp(),
        fornecedor: '',
        combustivel: 'Diesel S10',
        quantidade: '',
        valor_do_litro: '',
        valor_total: '',
        km_atual: '',
        hr_atual: '',
        observacao: '',
        arquivo_app: null,         // { dataUrl, size, width, height }
    });

    // -------------------------------------------------------------------------
    // Carrega veículo + último abastecimento para calcular km/hr anterior
    // -------------------------------------------------------------------------
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const v = await veiculosRepo.find(id);
                const veiculoData = v?.veiculo || v;
                setVeiculo(veiculoData);

                // Busca último abastecimento desse veículo no cache local
                const lista = await repo.listByVeiculo(id);
                const ult = lista?.[0]; // já vem ordenado desc por data

                setValoresAnteriores({
                    km: integerNumberValue(ult?.km_atual || 0),
                    hr: integerNumberValue(ult?.hr_atual || 0),
                });
            } catch (err) {
                console.error('Erro ao carregar veículo:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    // -------------------------------------------------------------------------
    // Auto-cálculo do valor total quando quantidade ou valor_do_litro mudam
    // -------------------------------------------------------------------------
    useEffect(() => {
        const q = decimalToNumber(form.quantidade);
        const v = currencyToNumber(form.valor_do_litro);
        if (q > 0 && v > 0) {
            const total = q * v;
            const centavos = Math.round(total * 100);
            // Formata como mascarado: "1234" centavos → "R$ 12,34"
            const masked = (centavos / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            setForm((f) => ({ ...f, valor_total: `R$ ${masked}` }));
        } else {
            setForm((f) => ({ ...f, valor_total: '' }));
        }
    }, [form.quantidade, form.valor_do_litro]);

    const handleField = (field, value) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    // -------------------------------------------------------------------------
    // Captura de foto
    // -------------------------------------------------------------------------
    const handleCapture = ({ dataUrl, blob, width, height }) => {
        setForm((f) => ({
            ...f,
            arquivo_app: { dataUrl, width, height, size: blob.size },
        }));
        setCameraOpen(false);
    };

    const handleRemovePhoto = () => {
        setForm((f) => ({ ...f, arquivo_app: null }));
    };

    // -------------------------------------------------------------------------
    // Validação (regras do legado)
    // -------------------------------------------------------------------------
    const validate = () => {
        if (!form.fornecedor.trim()) return 'Informe o fornecedor/posto.';
        if (!form.combustivel) return 'Selecione o combustível.';

        const quantidade = decimalToNumber(form.quantidade);
        const valorLitro = currencyToNumber(form.valor_do_litro);

        if (quantidade <= 0) return 'Informe a quantidade em litros.';
        if (valorLitro <= 0) return 'Informe o valor por litro.';

        const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;

        if (isMaquina) {
            const hrAtual = integerNumberValue(form.hr_atual);
            const hrAnterior = valoresAnteriores.hr;
            if (!hrAtual) return 'Informe o horímetro atual.';
            if (hrAtual < hrAnterior) {
                return `Horímetro atual (${hrAtual}h) não pode ser menor que o anterior (${hrAnterior}h).`;
            }
        } else {
            const kmAtual = integerNumberValue(form.km_atual);
            const kmAnterior = valoresAnteriores.km;
            if (!kmAtual) return 'Informe a quilometragem atual.';
            if (kmAtual < kmAnterior) {
                return `Hodômetro atual (${kmAtual} km) não pode ser menor que o anterior (${kmAnterior} km).`;
            }
        }
        return null;
    };

    // -------------------------------------------------------------------------
    // Salvar
    // -------------------------------------------------------------------------
    const handleSave = useCallback(async () => {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        setSaving(true);

        try {
            const payload = {
                veiculo_id: Number(id),
                data: form.data || nowLocalTimestamp(),
                fornecedor: form.fornecedor.trim(),
                combustivel: form.combustivel,
                quantidade: decimalToNumber(form.quantidade),
                valor_do_litro: currencyToNumber(form.valor_do_litro),
                valor_total: currencyToNumber(form.valor_total),
                km_atual: form.km_atual ? integerNumberValue(form.km_atual) : null,
                hr_atual: form.hr_atual ? integerNumberValue(form.hr_atual) : null,
                km_anterior: valoresAnteriores.km || null,
                hr_anterior: valoresAnteriores.hr || null,
                observacao: form.observacao || '',
                // Foto como dataUrl base64 (será decoded no server)
                arquivo_app_data_url: form.arquivo_app?.dataUrl || null,
            };
            await repo.create(payload);
            router.visit(`/mobile/veiculos/${id}/abastecimentos`);
        } catch (e) {
            setError(e.message || 'Erro ao salvar.');
            setSaving(false);
        }
    }, [form, id, valoresAnteriores, veiculo]);

    if (loading) {
        return (
            <MobileLayout header="Novo abastecimento" backUrl={`/mobile/veiculos/${id}/abastecimentos`} hideBottomNav>
                <div className="p-8 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2" />
                    <p className="text-sm">Carregando…</p>
                </div>
            </MobileLayout>
        );
    }

    const isMaquina = veiculo?.tipo == 4 || veiculo?.tipo_hr == 1;

    return (
        <MobileLayout header="Novo abastecimento" backUrl={`/mobile/veiculos/${id}/abastecimentos`} hideBottomNav>
            <Head title="Novo abastecimento" />

            <div className="p-3 space-y-4">
                {/* Header info */}
                {veiculo && (
                    <div className="bg-[#557bbb]/10 border border-[#557bbb]/20 rounded-lg px-3 py-2 text-xs text-gray-700">
                        Veículo: <strong>{veiculo.prefixo}</strong>
                        {veiculo.marca && ` — ${veiculo.marca}`}
                        {veiculo.modelo && ` ${veiculo.modelo}`}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
                    </div>
                )}

                {/* Data (read-only) */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data e hora</label>
                    <input
                        type="text"
                        readOnly
                        value={nowLocalDMYHM()}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm cursor-not-allowed"
                    />
                </div>

                {/* km/hr anterior (read-only) + atual */}
                {isMaquina ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                            <i className="fa-solid fa-gauge" />
                            <span>Horímetro</span>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Horímetro Anterior
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={valoresAnteriores.hr || '0'}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                            />
                        </div>
                        <IntegerInput
                            label="Horímetro Atual"
                            required
                            value={form.hr_atual}
                            onChange={(v) => handleField('hr_atual', v)}
                            suffix="h"
                            placeholder={String(valoresAnteriores.hr || 0)}
                        />
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2 text-blue-800 text-xs font-semibold">
                            <i className="fa-solid fa-road" />
                            <span>Quilometragem</span>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Hodômetro Anterior
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={valoresAnteriores.km || '0'}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                            />
                        </div>
                        <IntegerInput
                            label="Hodômetro Atual"
                            required
                            value={form.km_atual}
                            onChange={(v) => handleField('km_atual', v)}
                            suffix="km"
                            placeholder={String(valoresAnteriores.km || 0)}
                        />
                    </div>
                )}

                {/* Fornecedor */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Fornecedor / Posto <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.fornecedor}
                        onChange={(e) => handleField('fornecedor', e.target.value)}
                        placeholder="Ex: Posto Shell BR-101"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb]"
                    />
                </div>

                {/* Combustível */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Combustível <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={form.combustivel}
                        onChange={(e) => handleField('combustivel', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb]"
                    >
                        {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </div>

                {/* Quantidade + Valor por litro */}
                <div className="grid grid-cols-2 gap-2">
                    <DecimalInput
                        label="Quantidade"
                        required
                        value={form.quantidade}
                        onChange={(v) => handleField('quantidade', v)}
                        suffix="L"
                        placeholder="0,0"
                    />
                    <MoneyInput
                        label="Valor por Litro"
                        required
                        value={form.valor_do_litro}
                        onChange={(v) => handleField('valor_do_litro', v)}
                        placeholder="R$ 0,00"
                    />
                </div>

                {/* Valor total (calculado automaticamente) */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Valor Total <span className="text-[10px] text-gray-400">(automático)</span>
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={form.valor_total || 'R$ 0,00'}
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-base text-center cursor-not-allowed"
                    />
                </div>

                {/* Foto do comprovante */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Foto do comprovante
                    </label>

                    {form.arquivo_app?.dataUrl ? (
                        <div className="relative">
                            <img
                                src={form.arquivo_app.dataUrl}
                                alt="Comprovante"
                                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg active:scale-95"
                                aria-label="Remover foto"
                            >
                                <i className="fa-solid fa-trash text-xs" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCameraOpen(true)}
                                className="absolute bottom-2 right-2 w-10 h-10 flex items-center justify-center rounded-full bg-[#557bbb] text-white shadow-lg active:scale-95"
                                aria-label="Refazer foto"
                            >
                                <i className="fa-solid fa-camera-rotate" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setCameraOpen(true)}
                            className="w-full py-3 border-2 border-dashed border-[#e67e22] text-[#e67e22] rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-camera text-lg" />
                            Tirar Foto do Comprovante
                        </button>
                    )}
                </div>

                {/* Observação */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                    <textarea
                        rows={3}
                        value={form.observacao}
                        onChange={(e) => handleField('observacao', e.target.value)}
                        placeholder="Observações adicionais (opcional)"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb] resize-none"
                    />
                </div>

                {/* Botões */}
                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => router.visit(`/mobile/veiculos/${id}/abastecimentos`)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm disabled:opacity-60"
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
                    Os dados são salvos no celular. Toque em "Sincronizar" no menu para enviar ao servidor.
                </p>
            </div>

            {/* Camera modal */}
            <CameraCapture
                isOpen={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCapture}
                title="Foto do comprovante"
                quality={0.7}
                maxDimension={1920}
            />
        </MobileLayout>
    );
}
