// resources/js/Pages/Admin/Estoque/Produtos/Index.jsx
// -----------------------------------------------------------------------------
// Lista de produtos do catálogo com filtros + paginação. Design Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ProdutosIndex({ produtos, categorias, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        q:            filtros?.q ?? '',
        categoria_id: filtros?.categoria_id ?? '',
        ativo:        filtros?.ativo ?? '',
        abaixo_minimo: !!filtros?.abaixo_minimo,
    });

    const buscar = (e) => {
        e?.preventDefault?.();
        router.get(route('admin.estoque.produtos.index'), {
            ...f,
            abaixo_minimo: f.abaixo_minimo ? 1 : '',
        }, { preserveState: true, preserveScroll: true });
    };

    const limpar = () => {
        const reset = { q: '', categoria_id: '', ativo: '', abaixo_minimo: false };
        setF(reset);
        router.get(route('admin.estoque.produtos.index'), {}, {
            preserveState: true, preserveScroll: true,
        });
    };

    const excluir = (p) => {
        if (!confirm(`Excluir o produto "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
        router.delete(route('admin.estoque.produtos.destroy', p.id), { preserveScroll: true });
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <AuthenticatedLayout>
            <Head title="Produtos" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Produtos</h1>
                        <p className="text-sm text-gray-500">
                            Catálogo de produtos do estoque (saldo por obra).
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.estoque.categorias.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            <i className="fa-solid fa-folder-tree mr-1" />
                            Categorias
                        </Link>
                        <Link
                            href={route('admin.estoque.produtos.create')}
                            className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700"
                        >
                            + Novo produto
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

                <form onSubmit={buscar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                        type="text"
                        value={f.q}
                        onChange={(e) => setF({ ...f, q: e.target.value })}
                        placeholder="Buscar por nome, SKU, código de barras ou marca…"
                        className="md:col-span-2 border border-gray-300 rounded px-3 py-2"
                    />
                    <select
                        value={f.categoria_id}
                        onChange={(e) => setF({ ...f, categoria_id: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                    >
                        <option value="">Todas as categorias</option>
                        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <select
                        value={f.ativo}
                        onChange={(e) => setF({ ...f, ativo: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                    >
                        <option value="">Ativos e inativos</option>
                        <option value="1">Somente ativos</option>
                        <option value="0">Somente inativos</option>
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                            type="checkbox"
                            checked={f.abaixo_minimo}
                            onChange={(e) => setF({ ...f, abaixo_minimo: e.target.checked })}
                            className="h-4 w-4 text-rise-600 rounded"
                        />
                        Abaixo do mínimo
                    </label>
                    <div className="md:col-span-5 flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={limpar}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                            Limpar
                        </button>
                        <button className="px-4 py-2 bg-gray-800 text-white rounded text-sm">Filtrar</button>
                    </div>
                </form>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2 w-12"></th>
                                <th className="px-4 py-2">SKU</th>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2">Categoria</th>
                                <th className="px-4 py-2">Marca</th>
                                <th className="px-4 py-2 text-right">Unitário</th>
                                <th className="px-4 py-2 text-center">Unidade</th>
                                <th className="px-4 py-2 text-center">Status</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {produtos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-box-open text-3xl text-gray-300 mb-2 block" />
                                        Nenhum produto encontrado.
                                    </td>
                                </tr>
                            ) : produtos.data.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        {p.imagem ? (
                                            <img
                                                src={`/storage/${p.imagem}`}
                                                alt={p.nome}
                                                className="w-10 h-10 rounded object-cover border"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-gray-100 border flex items-center justify-center text-gray-400">
                                                <i className="fa-solid fa-box" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                                    <td className="px-4 py-2">
                                        <Link
                                            href={route('admin.estoque.produtos.show', p.id)}
                                            className="font-medium text-gray-900 hover:text-rise-600"
                                        >
                                            {p.nome}
                                        </Link>
                                        {p.codigo_barras && (
                                            <div className="text-[11px] text-gray-400">CB: {p.codigo_barras}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">
                                        {p.categoria?.nome || <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">
                                        {p.marca || <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-2 text-right">{moeda(p.valor_unitario)}</td>
                                    <td className="px-4 py-2 text-center text-gray-600">{p.unidade}</td>
                                    <td className="px-4 py-2 text-center">
                                        {p.ativo ? (
                                            <span className="bg-green-100 text-green-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                                Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="inline-flex gap-1">
                                            <Link
                                                href={route('admin.estoque.produtos.show', p.id)}
                                                title="Visualizar"
                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded"
                                            >
                                                <i className="fa-solid fa-eye" />
                                            </Link>
                                            <Link
                                                href={route('admin.estoque.produtos.edit', p.id)}
                                                title="Editar"
                                                className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                                            >
                                                <i className="fa-solid fa-pen-to-square" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => excluir(p)}
                                                title="Excluir"
                                                className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
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

                {/* Paginação — funciona com paginate (total) e simplePaginate (só prev/next) */}
                <Pagination produtos={produtos} />
            </div>
        </AuthenticatedLayout>
    );
}

// Paginação reutilizável: detecta se vem de paginate (com .total) ou
// simplePaginate (só com prev_page_url/next_page_url).
function Pagination({ produtos }) {
    const isSimple = typeof produtos.total === 'undefined';

    if (isSimple) {
        if (!produtos.prev_page_url && !produtos.next_page_url) return null;
        return (
            <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600">Página {produtos.current_page}</span>
                <div className="flex gap-2">
                    <a
                        href={produtos.prev_page_url || '#'}
                        className={`px-3 py-1.5 rounded border text-xs ${produtos.prev_page_url
                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'border-gray-200 text-gray-300 cursor-not-allowed pointer-events-none'}`}
                    >
                        ← Anterior
                    </a>
                    <a
                        href={produtos.next_page_url || '#'}
                        className={`px-3 py-1.5 rounded border text-xs ${produtos.next_page_url
                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'border-gray-200 text-gray-300 cursor-not-allowed pointer-events-none'}`}
                    >
                        Próximo →
                    </a>
                </div>
            </div>
        );
    }

    if (produtos.last_page <= 1) return null;
    return (
        <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-600">{produtos.from}–{produtos.to} de {produtos.total}</span>
            <div className="flex gap-1">
                {produtos.links.map((link, i) => (
                    <a
                        key={i}
                        href={link.url || '#'}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                        className={`px-3 py-1.5 rounded border text-xs ${
                            link.active
                                ? 'bg-rise-600 text-white border-rise-600'
                                : link.url
                                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    : 'border-gray-200 text-gray-300 cursor-not-allowed pointer-events-none'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
