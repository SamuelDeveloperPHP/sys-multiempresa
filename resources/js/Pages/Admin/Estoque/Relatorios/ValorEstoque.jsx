// resources/js/Pages/Admin/Estoque/Relatorios/ValorEstoque.jsx
// -----------------------------------------------------------------------------
// Relatório: snapshot do valor de estoque atual agrupado por obra ou categoria.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { moeda, numero } from './_filtros';

export default function ValorEstoque({ linhas, totais, agruparPor, obras, categorias, filtros }) {
    const [f, setF] = useState({
        obra_id:      filtros?.obra_id ?? '',
        categoria_id: filtros?.categoria_id ?? '',
        agrupar_por:  filtros?.agrupar_por ?? 'obra',
    });

    const aplicar = () => {
        router.get(route('admin.estoque.relatorios.valor-estoque'), f, {
            preserveState: true, preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Valor de estoque" />
            <div className="p-6 w-full max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Valor de estoque</h1>
                        <p className="text-sm text-gray-500">
                            Snapshot atual: soma de (quantidade × preço médio ponderado).
                            Agrupado por <strong>{agruparPor === 'obra' ? 'obra' : 'categoria'}</strong>.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.relatorios.hub')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                <div className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Agrupar por</label>
                        <select
                            value={f.agrupar_por}
                            onChange={(e) => setF({ ...f, agrupar_por: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                            <option value="obra">Obra</option>
                            <option value="categoria">Categoria</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Obra (filtro)</label>
                        <select
                            value={f.obra_id} onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                            <option value="">Todas</option>
                            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Categoria (filtro)</label>
                        <select
                            value={f.categoria_id} onChange={(e) => setF({ ...f, categoria_id: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                            <option value="">Todas</option>
                            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div className="self-end">
                        <button onClick={aplicar} className="w-full px-4 py-2 bg-gray-800 text-white rounded text-sm font-semibold">
                            Atualizar
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <KpiCard label="Produtos com saldo" value={totais.produtos_count} />
                    <KpiCard label="Obras com estoque" value={totais.obras_count} />
                    <KpiCard label="Qtd total" value={numero(totais.qtd_total)} />
                    <KpiCard label="Valor total em estoque" value={moeda(totais.valor_total)} destaque />
                </div>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">{agruparPor === 'obra' ? 'Obra' : 'Categoria'}</th>
                                <th className="px-4 py-2 text-right">Produtos</th>
                                <th className="px-4 py-2 text-right">Qtd total</th>
                                <th className="px-4 py-2 text-right">Valor</th>
                                <th className="px-4 py-2 text-right">% do total</th>
                                <th className="px-4 py-2 w-48">Distribuição</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {linhas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-sack-dollar text-3xl text-gray-300 mb-2 block" />
                                        Sem estoque no momento.
                                    </td>
                                </tr>
                            ) : linhas.map((l, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        {agruparPor === 'obra' ? (
                                            <>
                                                <div className="font-medium text-gray-900">{l.codigo_obra || `Obra #${l.obra_id}`}</div>
                                                <div className="text-[11px] text-gray-400 truncate max-w-[200px]">{l.nome_fantasia}</div>
                                            </>
                                        ) : (
                                            <div className="font-medium text-gray-900">{l.categoria_nome || 'Sem categoria'}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-600">{l.produtos_count}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">{numero(l.qtd_total)}</td>
                                    <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">{moeda(l.valor_total)}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{l.percentual}%</td>
                                    <td className="px-4 py-2">
                                        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${l.barra}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {linhas.length > 0 && (
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td className="px-4 py-2">Total geral</td>
                                    <td className="px-4 py-2 text-right">{totais.produtos_count}</td>
                                    <td className="px-4 py-2 text-right">{numero(totais.qtd_total)}</td>
                                    <td className="px-4 py-2 text-right text-emerald-700">{moeda(totais.valor_total)}</td>
                                    <td className="px-4 py-2 text-right">100%</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function KpiCard({ label, value, destaque = false }) {
    return (
        <div className={`bg-white border rounded-lg p-3 ${destaque ? 'border-emerald-300' : ''}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${destaque ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
        </div>
    );
}
