import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Listagem de TRANSFERÊNCIAS entre obras.
 * Cada linha é o registro TRANSF_OUT (representante do par OUT/IN).
 */
export default function TransferenciasIndex({ transferencias, obras, filtros }) {
    const [f, setF] = useState({
        obra_id:         filtros?.obra_id ?? '',
        obra_destino_id: filtros?.obra_destino_id ?? '',
        q:               filtros?.q ?? '',
        data_de:         filtros?.data_de ?? '',
        data_ate:        filtros?.data_ate ?? '',
    });

    const aplicar = (next = f) => router.get(route('admin.estoque.transferencias.index'), next,
        { preserveState: true, preserveScroll: true, replace: true });
    const setFiltro = (k, v) => { const n = { ...f, [k]: v }; setF(n); aplicar(n); };
    const limpar = () => {
        setF({ obra_id: '', obra_destino_id: '', q: '', data_de: '', data_ate: '' });
        router.get(route('admin.estoque.transferencias.index'), {}, { preserveScroll: true, replace: true });
    };

    const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    return (
        <AuthenticatedLayout>
            <Head title="Transferências entre Obras" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-orange-600">⇄</span> Transferências entre Obras
                        </h1>
                        <p className="text-sm text-gray-500">Cada transferência gera 2 registros (OUT + IN)</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.estoque.movimentacoes.index')}
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            Ver todas movimentações
                        </Link>
                        <Link href={route('admin.estoque.transferencias.create')}
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-sm">
                            + Nova transferência
                        </Link>
                    </div>
                </header>

                <div className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input type="text" placeholder="Buscar produto…" value={f.q}
                           onChange={(e) => setF({ ...f, q: e.target.value })}
                           onBlur={() => aplicar()}
                           className="border border-gray-300 rounded px-3 py-2 text-sm md:col-span-2" />
                    <select value={f.obra_id} onChange={(e) => setFiltro('obra_id', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Origem (todas)</option>
                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra}</option>)}
                    </select>
                    <select value={f.obra_destino_id} onChange={(e) => setFiltro('obra_destino_id', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Destino (todas)</option>
                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra}</option>)}
                    </select>
                    <div className="flex gap-2 md:col-span-2">
                        <input type="date" value={f.data_de} onChange={(e) => setFiltro('data_de', e.target.value)}
                               className="border border-gray-300 rounded px-2 py-2 text-sm flex-1" />
                        <input type="date" value={f.data_ate} onChange={(e) => setFiltro('data_ate', e.target.value)}
                               className="border border-gray-300 rounded px-2 py-2 text-sm flex-1" />
                        <button type="button" onClick={limpar}
                                className="px-3 py-2 border rounded text-sm text-gray-600">×</button>
                    </div>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left text-gray-700">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Data</th>
                                <th className="px-4 py-3 font-semibold">Produto</th>
                                <th className="px-4 py-3 font-semibold">Origem</th>
                                <th className="px-4 py-3 font-semibold text-center">→</th>
                                <th className="px-4 py-3 font-semibold">Destino</th>
                                <th className="px-4 py-3 font-semibold text-right">Qtd</th>
                                <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                <th className="px-4 py-3 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transferencias.data.length === 0 ? (
                                <tr><td colSpan={8} className="text-center text-gray-500 py-8">Nenhuma transferência encontrada.</td></tr>
                            ) : transferencias.data.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{t.data_movimento ? new Date(t.data_movimento).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{t.produto?.nome}</div>
                                        <div className="text-xs text-gray-500 font-mono">{t.produto?.sku}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                                            {t.obra?.codigo_obra}
                                        </span>
                                        <div className="text-[11px] text-gray-500 mt-0.5">{t.obra?.nome_fantasia}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-orange-500">⇒</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                            {t.obra_contraparte?.codigo_obra}
                                        </span>
                                        <div className="text-[11px] text-gray-500 mt-0.5">{t.obra_contraparte?.nome_fantasia}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                        {numero(t.quantidade)} <span className="text-xs text-gray-500">{t.produto?.unidade}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">{moeda(t.valor_total)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={route('admin.estoque.movimentacoes.show', t.id)}
                                              className="text-blue-700 hover:underline text-xs">Detalhes</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {transferencias.links && (
                    <nav className="flex justify-end gap-2 mt-4">
                        {transferencias.prev_page_url && <Link href={transferencias.prev_page_url} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">‹ Anterior</Link>}
                        {transferencias.next_page_url && <Link href={transferencias.next_page_url} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">Próximo ›</Link>}
                    </nav>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
