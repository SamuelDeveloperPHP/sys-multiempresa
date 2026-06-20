import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Listagem de ENTRADAS de estoque.
 *
 * Diferença frente à página unificada de Movimentações: foca apenas em entradas
 * (compra/recebimento). Mais limpa, sem coluna "tipo" e sem mistura com outras
 * operações.
 */
export default function EntradasIndex({ entradas, obras, fornecedores, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        obra_id:       filtros?.obra_id ?? '',
        fornecedor_id: filtros?.fornecedor_id ?? '',
        q:             filtros?.q ?? '',
        data_de:       filtros?.data_de ?? '',
        data_ate:      filtros?.data_ate ?? '',
    });

    const aplicar = (next = f) => router.get(route('admin.estoque.entradas.index'), next,
        { preserveState: true, preserveScroll: true, replace: true });

    const setFiltro = (key, value) => {
        const next = { ...f, [key]: value };
        setF(next);
        aplicar(next);
    };

    const limpar = () => {
        setF({ obra_id: '', fornecedor_id: '', q: '', data_de: '', data_ate: '' });
        router.get(route('admin.estoque.entradas.index'), {}, { preserveScroll: true, replace: true });
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    return (
        <AuthenticatedLayout>
            <Head title="Entradas de Estoque" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-emerald-600">⬇</span> Entradas de Estoque
                        </h1>
                        <p className="text-sm text-gray-500">Compras, recebimentos e doações</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.estoque.movimentacoes.index')}
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            Ver todas movimentações
                        </Link>
                        <Link href={route('admin.estoque.entradas.create')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm">
                            + Nova entrada
                        </Link>
                    </div>
                </header>

                {flash?.comprovante_lote_ids && (
                    <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                        <span className="text-sm text-emerald-800">
                            <i className="fa-solid fa-circle-check mr-1" />
                            {flash.success ?? 'Recebimento registrado.'}
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
                    <select value={f.fornecedor_id} onChange={(e) => setFiltro('fornecedor_id', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todos os fornecedores</option>
                        {fornecedores.map((s) => <option key={s.id} value={s.id}>{s.razao_social}</option>)}
                    </select>
                    <div className="flex gap-2">
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
                                <th className="px-4 py-3 font-semibold">Fornecedor</th>
                                <th className="px-4 py-3 font-semibold">NF</th>
                                <th className="px-4 py-3 font-semibold text-right">Qtd</th>
                                <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                <th className="px-4 py-3 font-semibold">Cadastrado por</th>
                                <th className="px-4 py-3 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {entradas.data.length === 0 ? (
                                <tr><td colSpan={9} className="text-center text-gray-500 py-8">Nenhuma entrada encontrada.</td></tr>
                            ) : entradas.data.map((e) => (
                                <tr key={e.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{e.data_movimento ? new Date(e.data_movimento).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{e.produto?.nome}</div>
                                        <div className="text-xs text-gray-500 font-mono">{e.produto?.sku}</div>
                                    </td>
                                    <td className="px-4 py-3">{e.obra?.codigo_obra} — {e.obra?.nome_fantasia}</td>
                                    <td className="px-4 py-3">{e.fornecedor?.razao_social ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{e.nota_fiscal ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                        +{numero(e.quantidade)} <span className="text-xs text-gray-500">{e.produto?.unidade}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{moeda(e.valor_total)}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-600 flex items-center gap-1" title={e.user_create ?? ''}>
                                            <i className="fa-solid fa-user text-gray-300" />
                                            {e.user_create ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <Link href={route('admin.estoque.entradas.show', e.id)}
                                              className="text-blue-700 hover:underline text-xs">Detalhes</Link>
                                        <Link href={route('admin.estoque.entradas.edit', e.id)}
                                              className="text-gray-500 hover:text-gray-800 hover:underline text-xs ml-3">Editar</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {entradas.links && (
                    <Paginacao paginator={entradas} />
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function Paginacao({ paginator }) {
    return (
        <nav className="flex justify-end gap-2 mt-4">
            {paginator.prev_page_url && (
                <Link href={paginator.prev_page_url} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">‹ Anterior</Link>
            )}
            {paginator.next_page_url && (
                <Link href={paginator.next_page_url} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">Próximo ›</Link>
            )}
        </nav>
    );
}
