import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const moeda = (v) =>
    v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Coleta ids dos nós até certa profundidade (para auto-expandir o topo da árvore).
function idsAteNivel(nodes, nivel, acc = []) {
    (nodes || []).forEach((n) => {
        if (nivel > 0) {
            acc.push(n.id);
            idsAteNivel(n.children, nivel - 1, acc);
        }
    });
    return acc;
}

export default function ComposicoesIndex({ composicoes, arvore, caminho, bases, tipos, filtros, totais }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        q:    filtros?.q ?? '',
        base: filtros?.base ?? '',
        tipo: filtros?.tipo ?? '',
    });
    const catSelecionada = filtros?.categoria_id ? Number(filtros.categoria_id) : null;
    const [aberto, setAberto] = useState(
        () => new Set([...idsAteNivel(arvore, 2), ...(caminho || []).map((c) => c.id)])
    );

    const navega = (extra) => {
        router.get(route('admin.tcpo.composicoes.index'),
            { q: f.q, base: f.base, tipo: f.tipo, categoria_id: catSelecionada ?? '', ...extra },
            { preserveState: true, preserveScroll: true });
    };

    const buscar = (e) => { e?.preventDefault?.(); navega({}); };
    const limpar = () => {
        setF({ q: '', base: '', tipo: '' });
        router.get(route('admin.tcpo.composicoes.index'), {}, { preserveState: true, preserveScroll: true });
    };
    const selecionarCategoria = (id) => navega({ categoria_id: id ?? '' });
    const toggle = (id) => setAberto((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    return (
        <AuthenticatedLayout>
            <Head title="Composições TCPO" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Composições TCPO</h1>
                        <p className="text-sm text-gray-500">
                            Catálogo de referência (PINI) — {totais?.composicoes ?? 0} composições, {totais?.insumos ?? 0} insumos
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href={route('admin.tcpo.composicoes.export', { q: f.q, base: f.base, tipo: f.tipo, categoria_id: catSelecionada ?? '' })}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            <i className="fa-solid fa-file-csv mr-2 text-green-600" />Exportar CSV
                        </a>
                        <a
                            href={route('admin.tcpo.composicoes.export-xlsx')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            title="Base completa em xlsx — 2 abas: blocos por composição + itens (flat)"
                        >
                            <i className="fa-solid fa-file-excel mr-2 text-emerald-600" />Exportar base (xlsx)
                        </a>
                        <Link href={route('admin.tcpo.insumos.index')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            <i className="fa-solid fa-cubes mr-2 text-gray-400" />Ver insumos
                        </Link>
                    </div>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
                )}

                <div className="flex gap-4 items-start">
                    {/* ÁRVORE DE CATEGORIAS */}
                    <aside className="w-72 flex-shrink-0 bg-white rounded-lg border overflow-hidden hidden lg:block">
                        <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">Estrutura (EAP)</span>
                            <button
                                onClick={() => selecionarCategoria(null)}
                                className={`text-[11px] px-2 py-0.5 rounded ${!catSelecionada ? 'bg-[#557bbb] text-white' : 'text-[#557bbb] hover:underline'}`}
                            >
                                Todas
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto py-1 text-[13px]">
                            {(arvore || []).map((n) => (
                                <No key={n.id} no={n} nivel={0} aberto={aberto} toggle={toggle}
                                    selecionada={catSelecionada} onSelect={selecionarCategoria} />
                            ))}
                        </div>
                    </aside>

                    {/* CONTEÚDO */}
                    <div className="flex-1 min-w-0">
                        {/* breadcrumb */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2 flex-wrap">
                            <button onClick={() => selecionarCategoria(null)} className="hover:text-[#557bbb]">Todas</button>
                            {(caminho || []).map((c) => (
                                <span key={c.id} className="flex items-center gap-1">
                                    <i className="fa-solid fa-chevron-right text-[8px] text-gray-300" />
                                    <button onClick={() => selecionarCategoria(c.id)} className="hover:text-[#557bbb]">{c.nome}</button>
                                </span>
                            ))}
                        </div>

                        <form onSubmit={buscar} className="bg-white rounded-lg border p-3 mb-3 grid grid-cols-1 md:grid-cols-6 gap-2">
                            <input
                                type="text"
                                value={f.q}
                                onChange={(e) => setF({ ...f, q: e.target.value })}
                                placeholder="Buscar por código, código EAP ou descrição…"
                                className="md:col-span-3 border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                            <select value={f.base} onChange={(e) => setF({ ...f, base: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm">
                                <option value="">Todas as bases</option>
                                {bases?.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm">
                                <option value="">Todos os tipos</option>
                                {tipos?.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 px-4 py-2 bg-gray-800 text-white rounded text-sm">Filtrar</button>
                                <button type="button" onClick={limpar} className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">Limpar</button>
                            </div>
                        </form>

                        <div className="bg-white rounded-lg shadow border overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 w-44">Código EAP</th>
                                        <th className="px-4 py-2">Descrição</th>
                                        <th className="px-4 py-2 w-16 text-center">Un</th>
                                        <th className="px-4 py-2 w-36">Tipo</th>
                                        <th className="px-4 py-2 w-32 text-right">Total s/ taxas</th>
                                        <th className="px-4 py-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {composicoes.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-gray-500 py-12">
                                                <i className="fa-solid fa-ruler-combined text-3xl text-gray-300 mb-2 block" />
                                                Nenhuma composição encontrada.
                                            </td>
                                        </tr>
                                    ) : composicoes.data.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <Link href={route('admin.tcpo.composicoes.show', c.id)} className="font-mono text-[#1d4ed8] hover:underline">
                                                    {c.codigo_alt || c.codigo}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2">
                                                <Link href={route('admin.tcpo.composicoes.show', c.id)} className="text-gray-900 hover:underline">
                                                    {c.descricao}
                                                </Link>
                                                {c.categoria && <div className="text-[11px] text-gray-400">{c.categoria.nome}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-center">{c.unidade || '—'}</td>
                                            <td className="px-4 py-2 text-gray-600">{c.tipo || '—'}</td>
                                            <td className="px-4 py-2 text-right font-medium">{moeda(c.total_sem_taxas)}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Link href={route('admin.tcpo.composicoes.show', c.id)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">
                                                    <i className="fa-solid fa-chevron-right" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination page={composicoes} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function No({ no, nivel, aberto, toggle, selecionada, onSelect }) {
    const temFilhos = no.children && no.children.length > 0;
    const isOpen = aberto.has(no.id);
    const isSel = selecionada === no.id;
    return (
        <div>
            <div
                className={`flex items-center gap-1 pr-2 py-1 cursor-pointer hover:bg-gray-50 ${isSel ? 'bg-[#e8f0fe]' : ''}`}
                style={{ paddingLeft: 6 + nivel * 12 }}
            >
                {temFilhos ? (
                    <button onClick={() => toggle(no.id)} className="w-4 text-gray-400 hover:text-gray-700 flex-shrink-0">
                        <i className={`fa-solid fa-caret-${isOpen ? 'down' : 'right'}`} />
                    </button>
                ) : (
                    <span className="w-4 flex-shrink-0 text-center text-gray-300">·</span>
                )}
                <button
                    onClick={() => onSelect(no.id)}
                    className={`text-left truncate flex-1 ${isSel ? 'text-[#1d4ed8] font-semibold' : 'text-gray-700'}`}
                    title={no.nome}
                >
                    {no.nome}
                </button>
            </div>
            {temFilhos && isOpen && no.children.map((ch) => (
                <No key={ch.id} no={ch} nivel={nivel + 1} aberto={aberto} toggle={toggle} selecionada={selecionada} onSelect={onSelect} />
            ))}
        </div>
    );
}

function Pagination({ page }) {
    const isSimple = typeof page.total === 'undefined';
    if (isSimple) {
        if (!page.prev_page_url && !page.next_page_url) return null;
        return (
            <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600">Página {page.current_page}</span>
                <div className="flex gap-2">
                    <a href={page.prev_page_url || '#'} className="px-3 py-1.5 rounded border text-xs border-gray-300 text-gray-700 hover:bg-gray-50">← Anterior</a>
                    <a href={page.next_page_url || '#'} className="px-3 py-1.5 rounded border text-xs border-gray-300 text-gray-700 hover:bg-gray-50">Próximo →</a>
                </div>
            </div>
        );
    }
    if (page.last_page <= 1) return null;
    return (
        <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-600">{page.from}–{page.to} de {page.total}</span>
            <div className="flex flex-wrap gap-1">
                {page.links.map((link, i) => (
                    <a key={i} href={link.url || '#'} dangerouslySetInnerHTML={{ __html: link.label }}
                        className={`px-3 py-1.5 rounded border text-xs ${
                            link.active ? 'bg-rise-600 text-white border-rise-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        } ${!link.url ? 'opacity-40 pointer-events-none' : ''}`} />
                ))}
            </div>
        </div>
    );
}
