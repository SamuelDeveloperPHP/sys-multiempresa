import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Listagem de SAÍDAS de estoque.
 * Mostra o retirante (funcionário ou usuário) e o método de validação.
 */
export default function SaidasIndex({ saidas, obras, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        obra_id:  filtros?.obra_id ?? '',
        q:        filtros?.q ?? '',
        data_de:  filtros?.data_de ?? '',
        data_ate: filtros?.data_ate ?? '',
    });

    const aplicar = (next = f) => router.get(route('admin.estoque.saidas.index'), next,
        { preserveState: true, preserveScroll: true, replace: true });
    const setFiltro = (k, v) => { const n = { ...f, [k]: v }; setF(n); aplicar(n); };
    const limpar = () => {
        setF({ obra_id: '', q: '', data_de: '', data_ate: '' });
        router.get(route('admin.estoque.saidas.index'), {}, { preserveScroll: true, replace: true });
    };

    const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    return (
        <AuthenticatedLayout>
            <Head title="Saídas de Estoque" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-red-600">⬆</span> Saídas de Estoque
                        </h1>
                        <p className="text-sm text-gray-500">Retiradas validadas por funcionário ou usuário</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.estoque.movimentacoes.index')}
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            Ver todas movimentações
                        </Link>
                        <Link href={route('admin.estoque.saidas.create')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm">
                            + Nova saída
                        </Link>
                    </div>
                </header>

                {flash?.comprovante_lote_ids && (
                    <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                        <span className="text-sm text-emerald-800">
                            <i className="fa-solid fa-circle-check mr-1" />
                            {flash.success ?? 'Saída registrada.'}
                        </span>
                        <a href={`${route('admin.estoque.comprovantes.lote')}?ids=${flash.comprovante_lote_ids}&auto_print=1`}
                           target="_blank" rel="noreferrer"
                           className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                            🖨 Imprimir comprovante
                        </a>
                    </div>
                )}

                <div className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input type="text" placeholder="Buscar produto…" value={f.q}
                           onChange={(e) => setF({ ...f, q: e.target.value })}
                           onBlur={() => aplicar()}
                           className="border border-gray-300 rounded px-3 py-2 text-sm md:col-span-2" />
                    <select value={f.obra_id} onChange={(e) => setFiltro('obra_id', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todas as obras</option>
                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
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
                                <th className="px-4 py-3 font-semibold">Obra</th>
                                <th className="px-4 py-3 font-semibold">Retirante</th>
                                <th className="px-4 py-3 font-semibold text-right">Qtd</th>
                                <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                <th className="px-4 py-3 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {saidas.data.length === 0 ? (
                                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Nenhuma saída encontrada.</td></tr>
                            ) : saidas.data.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{s.data_movimento ? new Date(s.data_movimento).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{s.produto?.nome}</div>
                                        <div className="text-xs text-gray-500 font-mono">{s.produto?.sku}</div>
                                    </td>
                                    <td className="px-4 py-3">{s.obra?.codigo_obra} — {s.obra?.nome_fantasia}</td>
                                    <td className="px-4 py-3">
                                        {s.retirante_funcionario ? (
                                            <div>
                                                <div className="text-sm">👷 {s.retirante_funcionario.nome}</div>
                                                <div className="text-[11px] text-gray-500">
                                                    {s.retirante_funcionario.matricula && `Matr. ${s.retirante_funcionario.matricula}`}
                                                </div>
                                            </div>
                                        ) : s.retirante ? (
                                            <div>
                                                <div className="text-sm">🖥 {s.retirante.name}</div>
                                                <div className="text-[11px] text-gray-500">{s.retirante.email}</div>
                                            </div>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                                        −{numero(s.quantidade)} <span className="text-xs text-gray-500">{s.produto?.unidade}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{moeda(s.valor_total)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <Link href={route('admin.estoque.saidas.show', s.id)}
                                              className="text-blue-700 hover:underline text-xs">Detalhes</Link>
                                        <Link href={route('admin.estoque.saidas.edit', s.id)}
                                              className="text-gray-500 hover:text-gray-800 hover:underline text-xs ml-3">Editar</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {saidas.links && (
                    <nav className="flex justify-end gap-2 mt-4">
                        {saidas.prev_page_url && <Link href={saidas.prev_page_url} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">‹ Anterior</Link>}
                        {saidas.next_page_url && <Link href={saidas.next_page_url} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">Próximo ›</Link>}
                    </nav>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
