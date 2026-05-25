// resources/js/Pages/Admin/Estoque/Movimentacoes/Index.jsx
// -----------------------------------------------------------------------------
// Lista de movimentações com filtros + paginação. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function MovimentacoesIndex({ movimentacoes, obras, tiposLabels, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        tipo:        filtros?.tipo ?? '',
        obra_id:     filtros?.obra_id ?? '',
        q:           filtros?.q ?? '',
        data_de:     filtros?.data_de ?? '',
        data_ate:    filtros?.data_ate ?? '',
    });

    const buscar = (e) => {
        e?.preventDefault?.();
        router.get(route('admin.estoque.movimentacoes.index'), f, {
            preserveState: true, preserveScroll: true,
        });
    };

    const limpar = () => {
        const reset = { tipo: '', obra_id: '', q: '', data_de: '', data_ate: '' };
        setF(reset);
        router.get(route('admin.estoque.movimentacoes.index'), {}, {
            preserveState: true, preserveScroll: true,
        });
    };

    const excluir = (m) => {
        if (!confirm(`Excluir esta movimentação? O saldo será recalculado.${m.tipo.startsWith('TRANSF') ? '\n\nO par TRANSF_IN/OUT também será removido.' : ''}`)) return;
        router.delete(route('admin.estoque.movimentacoes.destroy', m.id), { preserveScroll: true });
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

    const corClass = (tipo) => {
        const map = {
            ENTRADA:           'bg-emerald-100 text-emerald-700',
            SAIDA:             'bg-red-100 text-red-700',
            TRANSF_OUT:        'bg-orange-100 text-orange-700',
            TRANSF_IN:         'bg-blue-100 text-blue-700',
            AJUSTE_INVENTARIO: 'bg-amber-100 text-amber-700',
            DEVOLUCAO:         'bg-purple-100 text-purple-700',
        };
        return map[tipo] || 'bg-gray-100 text-gray-700';
    };

    const sinal = (tipo) => {
        if (['ENTRADA', 'TRANSF_IN', 'DEVOLUCAO'].includes(tipo)) return '+';
        if (['SAIDA', 'TRANSF_OUT'].includes(tipo)) return '−';
        return '±';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Movimentações de Estoque" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Movimentações de Estoque</h1>
                        <p className="text-sm text-gray-500">
                            Entrada, saída e transferência entre obras. Saldo é atualizado automaticamente.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`${route('admin.estoque.movimentacoes.create')}?tipo=ENTRADA`}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold"
                        >
                            <i className="fa-solid fa-arrow-down mr-1" />
                            Entrada
                        </Link>
                        <Link
                            href={`${route('admin.estoque.movimentacoes.create')}?tipo=SAIDA`}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
                        >
                            <i className="fa-solid fa-arrow-up mr-1" />
                            Saída
                        </Link>
                        <Link
                            href={`${route('admin.estoque.movimentacoes.create')}?tipo=TRANSF_OUT`}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-semibold"
                        >
                            <i className="fa-solid fa-right-left mr-1" />
                            Transferência
                        </Link>
                    </div>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
                        {flash.error}
                    </div>
                )}

                <form onSubmit={buscar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input
                        type="text"
                        value={f.q}
                        onChange={(e) => setF({ ...f, q: e.target.value })}
                        placeholder="Buscar produto (nome/SKU)…"
                        className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <select
                        value={f.tipo}
                        onChange={(e) => setF({ ...f, tipo: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                        <option value="">Todos os tipos</option>
                        {Object.entries(tiposLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <select
                        value={f.obra_id}
                        onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                        <option value="">Todas as obras</option>
                        {obras.map((o) => (
                            <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={f.data_de}
                        onChange={(e) => setF({ ...f, data_de: e.target.value })}
                        title="Data de"
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <input
                        type="date"
                        value={f.data_ate}
                        onChange={(e) => setF({ ...f, data_ate: e.target.value })}
                        title="Data até"
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <div className="md:col-span-6 flex gap-2 justify-end">
                        <button type="button" onClick={limpar}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                            Limpar
                        </button>
                        <button className="px-4 py-2 bg-gray-800 text-white rounded text-sm">Filtrar</button>
                    </div>
                </form>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Data</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2">Obra</th>
                                <th className="px-4 py-2 text-right">Qtd</th>
                                <th className="px-4 py-2 text-right">Valor total</th>
                                <th className="px-4 py-2">Doc</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {movimentacoes.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-arrow-right-arrow-left text-3xl text-gray-300 mb-2 block" />
                                        Nenhuma movimentação encontrada. Use os botões acima para registrar.
                                    </td>
                                </tr>
                            ) : movimentacoes.data.map((m) => (
                                <tr key={m.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        {new Date(m.data_movimento).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${corClass(m.tipo)}`}>
                                            {sinal(m.tipo)} {tiposLabels[m.tipo]?.label || m.tipo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="font-medium text-gray-900">{m.produto?.nome}</div>
                                        <div className="text-[11px] text-gray-400 font-mono">{m.produto?.sku}</div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="text-gray-700">{m.obra?.codigo_obra || m.obra?.nome}</div>
                                        {m.obra_contraparte_id && m.obra_contraparte && (
                                            <div className="text-[11px] text-gray-400">
                                                {m.tipo === 'TRANSF_OUT' ? '→ ' : '← '}{m.obra_contraparte.codigo_obra || m.obra_contraparte.nome}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                        {numero(m.quantidade)} {m.produto?.unidade}
                                    </td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">{moeda(m.valor_total)}</td>
                                    <td className="px-4 py-2">
                                        {m.nota_fiscal ? (
                                            <div>
                                                <div className="text-xs">NF {m.nota_fiscal}</div>
                                                {m.fornecedor && (
                                                    <div className="text-[11px] text-gray-400 truncate max-w-[120px]">
                                                        {m.fornecedor.razao_social}
                                                    </div>
                                                )}
                                            </div>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                        <div className="inline-flex gap-1">
                                            <Link
                                                href={route('admin.estoque.movimentacoes.show', m.id)}
                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded"
                                                title="Detalhes"
                                            >
                                                <i className="fa-solid fa-eye" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => excluir(m)}
                                                className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Excluir"
                                            >
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {movimentacoes.last_page > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                            {movimentacoes.from}–{movimentacoes.to} de {movimentacoes.total}
                        </span>
                        <div className="flex gap-1">
                            {movimentacoes.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    preserveScroll
                                    preserveState
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded border text-xs ${
                                        link.active
                                            ? 'bg-rise-600 text-white border-rise-600'
                                            : link.url
                                                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
