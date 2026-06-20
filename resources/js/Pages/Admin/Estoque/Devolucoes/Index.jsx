// resources/js/Pages/Admin/Estoque/Devolucoes/Index.jsx
// -----------------------------------------------------------------------------
// Lista de devoluções internas. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_COR = {
    PENDENTE:  { bg: 'bg-amber-100',    text: 'text-amber-700',   icon: 'fa-hourglass-half', label: 'Aguardando aprovação' },
    APROVADA:  { bg: 'bg-emerald-100',  text: 'text-emerald-700', icon: 'fa-check-circle',    label: 'Aprovada' },
    REJEITADA: { bg: 'bg-red-100',      text: 'text-red-700',     icon: 'fa-circle-xmark',    label: 'Rejeitada' },
};

export default function DevolucoesIndex({ devolucoes, obras, contadores, podeAprovar, filtros }) {
    const { flash } = usePage().props;
    const [f, setF] = useState({
        status:        filtros?.status ?? '',
        obra_id:       filtros?.obra_id ?? '',
        q:             filtros?.q ?? '',
        apenas_minhas: !!filtros?.apenas_minhas,
    });

    const buscar = (e) => {
        e?.preventDefault?.();
        router.get(route('admin.estoque.devolucoes.index'), {
            ...f, apenas_minhas: f.apenas_minhas ? 1 : '',
        }, { preserveState: true, preserveScroll: true });
    };

    const aplicarStatus = (status) => {
        const next = { ...f, status };
        setF(next);
        router.get(route('admin.estoque.devolucoes.index'), {
            ...next, apenas_minhas: next.apenas_minhas ? 1 : '',
        }, { preserveState: true, preserveScroll: true });
    };

    const limpar = () => {
        setF({ status: '', obra_id: '', q: '', apenas_minhas: false });
        router.get(route('admin.estoque.devolucoes.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

    return (
        <AuthenticatedLayout>
            <Head title="Devoluções de Estoque" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Devoluções internas</h1>
                        <p className="text-sm text-gray-500">
                            Material devolvido pelo funcionário ao estoque (ex.: sobra de obra).
                            Almoxarife valida com senha e o sistema lança o crédito automaticamente.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.devolucoes.create')}
                        className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700 text-sm font-semibold">
                        + Nova devolução
                    </Link>
                </header>

                {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

                {!podeAprovar && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 mb-4 text-sm">
                        <i className="fa-solid fa-circle-info mr-1" />
                        Você pode <strong>criar</strong> devoluções, mas não tem permissão para aprová-las.
                        Apenas usuários com <code className="bg-white px-1 rounded">can_edit</code> no módulo
                        <code className="bg-white px-1 rounded ml-1">estoque.devolucoes</code> (ou super-admin) podem aprovar.
                    </div>
                )}

                {/* Contadores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <ContadorCard ativo={!f.status} onClick={() => aplicarStatus('')}
                        label="Todas" total={Object.values(contadores).reduce((a, b) => a + b, 0)}
                        cor="bg-gray-50 border-gray-200 text-gray-700"
                        ativoCor="bg-gray-200 border-gray-400 text-gray-800"
                    />
                    {Object.entries(STATUS_COR).map(([st, c]) => (
                        <ContadorCard
                            key={st}
                            ativo={f.status === st}
                            onClick={() => aplicarStatus(st)}
                            label={c.label}
                            total={contadores[st] || 0}
                            icon={c.icon}
                            cor="bg-white border-gray-200 text-gray-600"
                            ativoCor={`${c.bg} border-current ${c.text}`}
                        />
                    ))}
                </div>

                <form onSubmit={buscar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                        type="text" placeholder="Buscar número/motivo/observação…"
                        value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })}
                        className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <select value={f.obra_id} onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todas as obras</option>
                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={f.apenas_minhas}
                            onChange={(e) => setF({ ...f, apenas_minhas: e.target.checked })}
                            className="h-4 w-4 text-rise-600 rounded" />
                        Apenas minhas
                    </label>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={limpar} className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Limpar</button>
                        <button className="px-4 py-2 bg-gray-800 text-white rounded text-sm">Filtrar</button>
                    </div>
                </form>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Número</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Funcionário</th>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2 text-right">Qtd</th>
                                <th className="px-4 py-2 text-right">Valor</th>
                                <th className="px-4 py-2">Data</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {devolucoes.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-rotate-left text-3xl text-gray-300 mb-2 block" />
                                        Nenhuma devolução encontrada.
                                    </td>
                                </tr>
                            ) : devolucoes.data.map((d) => {
                                const sc = STATUS_COR[d.status];
                                return (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <Link href={route('admin.estoque.devolucoes.show', d.id)}
                                                className="font-mono font-medium text-gray-900 hover:text-rise-600">{d.numero}</Link>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                                                <i className={`fa-solid ${sc.icon} mr-1`} />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">{d.funcionario?.name}</td>
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-gray-900 truncate max-w-[260px]">{d.produto?.nome}</div>
                                            <div className="text-[11px] text-gray-400 font-mono">{d.produto?.sku}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                            {numero(d.quantidade)} {d.produto?.unidade}
                                        </td>
                                        <td className="px-4 py-2 text-right whitespace-nowrap">{moeda(d.quantidade * d.valor_unitario)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {new Date(d.data_criacao).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Link href={route('admin.estoque.devolucoes.show', d.id)}
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

                {(devolucoes.prev_page_url || devolucoes.next_page_url) && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Página {devolucoes.current_page}</span>
                        <div className="flex gap-2">
                            <a href={devolucoes.prev_page_url || '#'}
                                className={`px-3 py-1.5 rounded border text-xs ${devolucoes.prev_page_url ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-300 pointer-events-none'}`}>← Anterior</a>
                            <a href={devolucoes.next_page_url || '#'}
                                className={`px-3 py-1.5 rounded border text-xs ${devolucoes.next_page_url ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-300 pointer-events-none'}`}>Próximo →</a>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function ContadorCard({ ativo, onClick, label, total, icon, cor, ativoCor }) {
    return (
        <button type="button" onClick={onClick}
            className={`text-left px-3 py-2 rounded-lg border transition ${ativo ? ativoCor : cor} hover:shadow-sm`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                    {icon && <i className={`fa-solid ${icon} mr-1`} />}
                    {label}
                </span>
                <span className="text-base font-bold">{total}</span>
            </div>
        </button>
    );
}
