import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const moeda = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const CLASSE = {
    MOD: { label: 'Mão de obra', cls: 'bg-blue-100 text-blue-700' },
    MAT: { label: 'Material', cls: 'bg-amber-100 text-amber-700' },
    EQP: { label: 'Equipamento', cls: 'bg-purple-100 text-purple-700' },
    EQH: { label: 'Equip. (hora)', cls: 'bg-purple-100 text-purple-700' },
    SER: { label: 'Sub-composição', cls: 'bg-emerald-100 text-emerald-700' },
};

function badgeClasse(c) {
    if (CLASSE[c]) return CLASSE[c];
    const u = (c || '').toUpperCase();
    if (u.startsWith('MO')) return { label: 'Mão de obra', cls: 'bg-blue-100 text-blue-700' };
    if (u.startsWith('EQ')) return { label: 'Equipamento', cls: 'bg-purple-100 text-purple-700' };
    return { label: c || '—', cls: 'bg-gray-100 text-gray-600' };
}

export default function InsumosIndex({ insumos, bases, filtros, total }) {
    const [f, setF] = useState({
        q:      filtros?.q ?? '',
        classe: filtros?.classe ?? '',
        base:   filtros?.base ?? '',
    });

    const buscar = (e) => {
        e?.preventDefault?.();
        router.get(route('admin.tcpo.insumos.index'), { ...f }, { preserveState: true, preserveScroll: true });
    };
    const limpar = () => {
        setF({ q: '', classe: '', base: '' });
        router.get(route('admin.tcpo.insumos.index'), {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Insumos TCPO" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Insumos TCPO</h1>
                        <p className="text-sm text-gray-500">Mão de obra, material e equipamento — {total ?? 0} insumos</p>
                    </div>
                    <Link href={route('admin.tcpo.composicoes.index')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        <i className="fa-solid fa-list-check mr-2 text-gray-400" />Ver composições
                    </Link>
                </header>

                <form onSubmit={buscar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input
                        type="text"
                        value={f.q}
                        onChange={(e) => setF({ ...f, q: e.target.value })}
                        placeholder="Buscar por código ou descrição…"
                        className="md:col-span-3 border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <select value={f.classe} onChange={(e) => setF({ ...f, classe: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todas as classes</option>
                        <option value="MOD">Mão de obra</option>
                        <option value="MAT">Material</option>
                        <option value="EQP">Equipamento</option>
                    </select>
                    <select value={f.base} onChange={(e) => setF({ ...f, base: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todas as bases</option>
                        {bases?.map((b) => <option key={b} value={b}>{b}</option>)}
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
                                <th className="px-4 py-2 w-44">Código</th>
                                <th className="px-4 py-2">Descrição</th>
                                <th className="px-4 py-2 w-28">Classe</th>
                                <th className="px-4 py-2 w-16 text-center">Un</th>
                                <th className="px-4 py-2 w-28 text-right">Preço unit.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {insumos.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-cubes text-3xl text-gray-300 mb-2 block" />
                                        Nenhum insumo encontrado.
                                    </td>
                                </tr>
                            ) : insumos.data.map((i) => {
                                const k = badgeClasse(i.classe);
                                return (
                                    <tr key={i.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-mono text-[11px] text-gray-500 whitespace-nowrap">{i.codigo}</td>
                                        <td className="px-4 py-2 text-gray-900">{i.descricao}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${k.cls}`}>{k.label}</span>
                                        </td>
                                        <td className="px-4 py-2 text-center">{i.unidade || '—'}</td>
                                        <td className="px-4 py-2 text-right font-medium">{moeda(i.preco_unitario)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <Pagination page={insumos} />
            </div>
        </AuthenticatedLayout>
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
