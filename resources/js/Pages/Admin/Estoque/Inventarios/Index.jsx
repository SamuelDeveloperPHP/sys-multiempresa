// resources/js/Pages/Admin/Estoque/Inventarios/Index.jsx
// -----------------------------------------------------------------------------
// Lista de inventários + dashboard de alertas de estoque mínimo. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_COR = {
    ABERTO:    { bg: 'bg-blue-100',    text: 'text-blue-700',    icon: 'fa-clipboard-check', label: 'Em contagem' },
    FECHADO:   { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-check-circle',     label: 'Fechado' },
    CANCELADO: { bg: 'bg-gray-200',    text: 'text-gray-600',    icon: 'fa-ban',              label: 'Cancelado' },
};

export default function InventariosIndex({ inventarios, obras, contadores, alertasMinimo, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        status:  filtros?.status ?? '',
        obra_id: filtros?.obra_id ?? '',
        q:       filtros?.q ?? '',
    });

    const buscar = (e) => {
        e?.preventDefault?.();
        router.get(route('admin.estoque.inventarios.index'), f, { preserveState: true, preserveScroll: true });
    };

    const limpar = () => {
        setF({ status: '', obra_id: '', q: '' });
        router.get(route('admin.estoque.inventarios.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <AuthenticatedLayout>
            <Head title="Inventários e Alertas" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Inventários e Alertas</h1>
                        <p className="text-sm text-gray-500">
                            Contagem física por obra + monitoramento de estoque mínimo.
                        </p>
                    </div>
                    <Link
                        href={route('admin.estoque.inventarios.create')}
                        className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700 text-sm font-semibold"
                    >
                        <i className="fa-solid fa-plus mr-1" />
                        Abrir inventário
                    </Link>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>
                )}

                {/* DASHBOARD ALERTAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow border overflow-hidden">
                        <div className="px-4 py-3 border-b bg-amber-50 flex items-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-amber-600" />
                            <h2 className="text-sm font-semibold text-amber-900">
                                Alertas de estoque abaixo do mínimo
                                <span className="ml-2 bg-amber-200 text-amber-900 text-[11px] px-2 py-0.5 rounded-full font-bold">
                                    {alertasMinimo.length}
                                </span>
                            </h2>
                        </div>
                        {alertasMinimo.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 text-sm">
                                <i className="fa-solid fa-check-circle text-emerald-500 text-2xl mb-2 block" />
                                Nenhum produto abaixo do mínimo nesta empresa.
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-left text-gray-700">
                                    <tr>
                                        <th className="px-4 py-2">Produto</th>
                                        <th className="px-4 py-2">Obra</th>
                                        <th className="px-4 py-2 text-right">Atual</th>
                                        <th className="px-4 py-2 text-right">Mínimo</th>
                                        <th className="px-4 py-2 text-right">Faltam</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {alertasMinimo.map((a) => {
                                        const faltam = Number(a.minimo || 0) - Number(a.quantidade || 0);
                                        return (
                                            <tr key={a.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">
                                                    <div className="font-medium text-gray-900 truncate max-w-[260px]">{a.produto_nome}</div>
                                                    <div className="text-[11px] text-gray-400 font-mono">{a.produto_sku}</div>
                                                </td>
                                                <td className="px-4 py-2 text-gray-600">{a.obra?.codigo_obra || '—'}</td>
                                                <td className="px-4 py-2 text-right text-red-600 font-semibold">{numero(a.quantidade)} {a.unidade}</td>
                                                <td className="px-4 py-2 text-right text-gray-600">{numero(a.minimo)}</td>
                                                <td className="px-4 py-2 text-right text-red-700 font-bold">{numero(faltam)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* CONTADORES */}
                    <div className="space-y-3">
                        <ContadorCard
                            label="Em contagem"
                            total={contadores.ABERTO || 0}
                            cor="bg-blue-50 border-blue-200 text-blue-700"
                            icon="fa-clipboard-check"
                            ativo={f.status === 'ABERTO'}
                            onClick={() => { setF({ ...f, status: 'ABERTO' }); router.get(route('admin.estoque.inventarios.index'), { ...f, status: 'ABERTO' }, { preserveState: true }); }}
                        />
                        <ContadorCard
                            label="Fechados"
                            total={contadores.FECHADO || 0}
                            cor="bg-emerald-50 border-emerald-200 text-emerald-700"
                            icon="fa-check-circle"
                            ativo={f.status === 'FECHADO'}
                            onClick={() => { setF({ ...f, status: 'FECHADO' }); router.get(route('admin.estoque.inventarios.index'), { ...f, status: 'FECHADO' }, { preserveState: true }); }}
                        />
                        <ContadorCard
                            label="Cancelados"
                            total={contadores.CANCELADO || 0}
                            cor="bg-gray-100 border-gray-300 text-gray-700"
                            icon="fa-ban"
                            ativo={f.status === 'CANCELADO'}
                            onClick={() => { setF({ ...f, status: 'CANCELADO' }); router.get(route('admin.estoque.inventarios.index'), { ...f, status: 'CANCELADO' }, { preserveState: true }); }}
                        />
                    </div>
                </div>

                {/* FILTROS */}
                <form onSubmit={buscar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        type="text" placeholder="Buscar por número ou observação…"
                        value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })}
                        className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <select value={f.obra_id} onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todas as obras</option>
                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                    </select>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={limpar} className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Limpar</button>
                        <button className="px-4 py-2 bg-gray-800 text-white rounded text-sm">Filtrar</button>
                    </div>
                </form>

                {/* LISTA */}
                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Número</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Obra</th>
                                <th className="px-4 py-2">Responsável</th>
                                <th className="px-4 py-2">Data início</th>
                                <th className="px-4 py-2 text-right">Itens / Contados</th>
                                <th className="px-4 py-2 text-right">Diferença</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {inventarios.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-clipboard-list text-3xl text-gray-300 mb-2 block" />
                                        Nenhum inventário encontrado.
                                    </td>
                                </tr>
                            ) : inventarios.data.map((inv) => {
                                const sc = STATUS_COR[inv.status];
                                return (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <Link href={route('admin.estoque.inventarios.show', inv.id)}
                                                className="font-mono font-medium text-gray-900 hover:text-rise-600">
                                                {inv.numero}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                                                <i className={`fa-solid ${sc.icon} mr-1`} />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="text-gray-700">{inv.obra?.codigo_obra}</div>
                                            <div className="text-[11px] text-gray-400 truncate max-w-[160px]">{inv.obra?.nome_fantasia}</div>
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">{inv.responsavel?.name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {new Date(inv.data_inicio).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <span className="font-medium">{inv.itens_contados_count}</span>
                                            <span className="text-gray-400"> / {inv.itens_count}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right whitespace-nowrap">
                                            <span className={Number(inv.valor_diferenca_total) < 0 ? 'text-red-600' : Number(inv.valor_diferenca_total) > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                                                {moeda(inv.valor_diferenca_total)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Link href={route('admin.estoque.inventarios.show', inv.id)}
                                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded inline-block">
                                                <i className="fa-solid fa-eye" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {(inventarios.prev_page_url || inventarios.next_page_url) && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Página {inventarios.current_page}</span>
                        <div className="flex gap-2">
                            <a href={inventarios.prev_page_url || '#'}
                                className={`px-3 py-1.5 rounded border text-xs ${inventarios.prev_page_url ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-300 pointer-events-none'}`}>← Anterior</a>
                            <a href={inventarios.next_page_url || '#'}
                                className={`px-3 py-1.5 rounded border text-xs ${inventarios.next_page_url ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-300 pointer-events-none'}`}>Próximo →</a>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function ContadorCard({ label, total, cor, icon, ativo, onClick }) {
    return (
        <button type="button" onClick={onClick}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 ${cor} ${ativo ? 'ring-2 ring-offset-1 ring-current' : ''} hover:shadow-sm transition`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-1">{total}</p>
                </div>
                <i className={`fa-solid ${icon} text-2xl opacity-50`} />
            </div>
        </button>
    );
}
