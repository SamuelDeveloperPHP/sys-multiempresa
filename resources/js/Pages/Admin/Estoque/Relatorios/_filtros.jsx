// resources/js/Pages/Admin/Estoque/Relatorios/_filtros.jsx
// Helpers reutilizáveis para todos os relatórios. Padrão Rise.

import { useState } from 'react';
import { router } from '@inertiajs/react';

/**
 * Card de filtro por período + obra. Submete via GET para a mesma rota
 * (servidor responde com nova página Inertia).
 */
export function FiltrosCard({ rota, obras, filtros, extras = null, mostrarObra = true }) {
    const [f, setF] = useState({
        data_de:  filtros?.data_de ?? '',
        data_ate: filtros?.data_ate ?? '',
        obra_id:  filtros?.obra_id ?? '',
        ...(filtros || {}),
    });

    const submit = (e) => {
        e?.preventDefault?.();
        router.get(route(rota), f, { preserveState: true, preserveScroll: true });
    };

    const presetPeriodo = (dias) => {
        const ate = new Date();
        const de = new Date();
        de.setDate(ate.getDate() - dias + 1);
        const novo = { ...f, data_de: de.toISOString().slice(0, 10), data_ate: ate.toISOString().slice(0, 10) };
        setF(novo);
        router.get(route(rota), novo, { preserveState: true, preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-lg border p-4 mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs text-gray-500 self-center mr-2">Período rápido:</span>
                {[
                    { label: 'Últimos 7 dias', dias: 7 },
                    { label: 'Últimos 30 dias', dias: 30 },
                    { label: 'Últimos 90 dias', dias: 90 },
                    { label: 'Ano atual', dias: 365 },
                ].map((p) => (
                    <button
                        key={p.dias}
                        type="button"
                        onClick={() => presetPeriodo(p.dias)}
                        className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Data de</label>
                    <input
                        type="date" value={f.data_de}
                        onChange={(e) => setF({ ...f, data_de: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Data até</label>
                    <input
                        type="date" value={f.data_ate}
                        onChange={(e) => setF({ ...f, data_ate: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                </div>
                {mostrarObra && (
                    <div className="md:col-span-2">
                        <label className="block text-[11px] text-gray-500 mb-1">Obra</label>
                        <select
                            value={f.obra_id} onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                            <option value="">Todas as obras</option>
                            {obras.map((o) => (
                                <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="self-end">
                    <button type="submit" className="w-full px-4 py-2 bg-gray-800 text-white rounded text-sm font-semibold">
                        Atualizar
                    </button>
                </div>
            </div>

            {extras && (
                <div className="mt-3 pt-3 border-t">{extras({ f, setF })}</div>
            )}
        </form>
    );
}

export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numero = (v, casas = 3) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
