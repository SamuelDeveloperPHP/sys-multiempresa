// resources/js/Pages/Admin/Estoque/Saldos/Index.jsx
// -----------------------------------------------------------------------------
// Saldos por obra — tela completa de visualização do catálogo × obra.
//
// Regra: catálogo é global, então listamos TODOS os produtos para a obra
// escolhida, mesmo com saldo zero. Filtros: categoria, busca, situação,
// inativos. Ordenação configurável por coluna. KPIs no topo.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const SITUACOES = [
    { value: 'todos',       label: 'Todos' },
    { value: 'com_saldo',   label: 'Com saldo' },
    { value: 'sem_saldo',   label: 'Sem saldo' },
    { value: 'abaixo_min',  label: 'Abaixo do mínimo' },
    { value: 'critico',     label: 'Crítico (zero c/ mínimo)' },
];

export default function SaldosIndex({ produtos, kpis, obras, categorias, filtros }) {
    const [f, setF] = useState({
        obra_id:          filtros?.obra_id ?? '',
        categoria_id:     filtros?.categoria_id ?? '',
        q:                filtros?.q ?? '',
        situacao:         filtros?.situacao ?? 'todos',
        mostrar_inativos: filtros?.mostrar_inativos ?? false,
        sort:             filtros?.sort ?? 'valor_total',
        dir:              filtros?.dir ?? 'desc',
    });

    /* Aplica filtros — selects/checkboxes imediato; campo `q` debounced */
    const aplicar = (next = f) => router.get(route('admin.estoque.saldos.index'), next, {
        preserveState: true, preserveScroll: true, replace: true,
    });
    const setFiltro = (k, v) => {
        const next = { ...f, [k]: v };
        setF(next);
        if (k !== 'q') aplicar(next);
    };
    const qInicial = useRef(filtros?.q ?? '');
    useEffect(() => {
        if (f.q === qInicial.current) return;
        const t = setTimeout(() => { qInicial.current = f.q; aplicar(); }, 350);
        return () => clearTimeout(t);
    }, [f.q]);

    const limpar = () => {
        const reset = {
            obra_id: f.obra_id,  // mantém obra (obrigatória)
            categoria_id: '', q: '', situacao: 'todos',
            mostrar_inativos: false, sort: 'valor_total', dir: 'desc',
        };
        setF(reset);
        qInicial.current = '';
        aplicar(reset);
    };

    /* Sort: clica no header — toggle asc/desc, ou troca de coluna (desc) */
    const ordenar = (col) => {
        const next = { ...f, sort: col, dir: f.sort === col ? (f.dir === 'asc' ? 'desc' : 'asc') : 'desc' };
        setF(next);
        aplicar(next);
    };

    const dataSelecionada = !!f.obra_id;
    const obraSel = obras.find((o) => String(o.id) === String(f.obra_id));

    return (
        <AuthenticatedLayout>
            <Head title="Saldos por Obra" />
            <div className="p-6 w-full">
                <header className="flex items-start justify-between mb-6 gap-3 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-indigo-600">📦</span> Saldos por Obra
                        </h1>
                        <p className="text-sm text-gray-500">
                            Catálogo completo × obra selecionada · todos os produtos aparecem (mesmo com saldo zero).
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('admin.estoque.movimentacoes.index')}
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            Movimentações
                        </Link>
                        <a href={route('admin.estoque.saldos.exportar', f)}
                           className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                               dataSelecionada
                                   ? 'bg-gray-800 hover:bg-gray-900 text-white'
                                   : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                           }`}
                           title={dataSelecionada ? 'Baixa CSV com os filtros atuais' : 'Selecione uma obra primeiro'}>
                            ⬇ Exportar CSV
                        </a>
                    </div>
                </header>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <KpiCard label="Total SKUs"   value={kpis.total_skus.toLocaleString('pt-BR')} color="bg-gray-100 text-gray-700" />
                    <KpiCard label="Com saldo"    value={kpis.com_saldo.toLocaleString('pt-BR')}  color="bg-emerald-100 text-emerald-700" />
                    <KpiCard label="Sem saldo"    value={kpis.sem_saldo.toLocaleString('pt-BR')}  color="bg-gray-100 text-gray-600" />
                    <KpiCard label="Abaixo mín."  value={kpis.abaixo_min.toLocaleString('pt-BR')} color="bg-amber-100 text-amber-700" icon="⚠" />
                    <KpiCard label="Valor total"  value={fmtMoney(kpis.valor_total)} color="bg-indigo-100 text-indigo-700" />
                </div>

                {/* Filtros */}
                <div className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-2">
                    <select value={f.obra_id} onChange={(e) => setFiltro('obra_id', e.target.value)}
                            className="md:col-span-3 border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">— Selecione a obra —</option>
                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                    </select>
                    <select value={f.categoria_id} onChange={(e) => setFiltro('categoria_id', e.target.value)}
                            className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Todas as categorias</option>
                        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <input type="text" placeholder="Buscar (nome/SKU/EAN)…" value={f.q}
                           onChange={(e) => setF({ ...f, q: e.target.value })}
                           className="md:col-span-3 border border-gray-300 rounded px-3 py-2 text-sm" />
                    <select value={f.situacao} onChange={(e) => setFiltro('situacao', e.target.value)}
                            className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm">
                        {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <label className="md:col-span-1 flex items-center gap-2 text-xs text-gray-700 px-2">
                        <input type="checkbox" checked={f.mostrar_inativos}
                               onChange={(e) => setFiltro('mostrar_inativos', e.target.checked)} />
                        Inativos
                    </label>
                    <button type="button" onClick={limpar}
                            className="md:col-span-1 border border-gray-300 rounded px-2 py-2 text-sm text-gray-600 hover:bg-gray-50">
                        Limpar
                    </button>
                </div>

                {/* Tabela */}
                {!dataSelecionada ? (
                    <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
                        <div className="text-4xl mb-2">📍</div>
                        Selecione uma obra acima para listar os saldos.
                    </div>
                ) : (
                    <div className="bg-white border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-left text-gray-700">
                                <tr>
                                    <th className="px-3 py-3 font-semibold w-12"></th>
                                    <Th col="nome"         f={f} onSort={ordenar}>Produto</Th>
                                    <th className="px-3 py-3 font-semibold">Categoria</th>
                                    <Th col="quantidade"   f={f} onSort={ordenar} align="right">Saldo</Th>
                                    <Th col="estoque_minimo" f={f} onSort={ordenar} align="right">Mínimo</Th>
                                    <Th col="valor_medio"  f={f} onSort={ordenar} align="right">PMP</Th>
                                    <Th col="valor_total"  f={f} onSort={ordenar} align="right">Valor total</Th>
                                    <Th col="ultima"       f={f} onSort={ordenar}>Última mov.</Th>
                                    <th className="px-3 py-3 font-semibold text-right">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {produtos.data?.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center text-gray-500 py-8">
                                        Nenhum produto bate com os filtros.
                                    </td></tr>
                                ) : produtos.data?.map((p) => (
                                    <Linha key={p.id} p={p} />
                                ))}
                            </tbody>
                            {produtos.data?.length > 0 && (
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan={6} className="px-3 py-3 text-right font-semibold text-gray-700">
                                            Total geral · {kpis.total_skus.toLocaleString('pt-BR')} SKU(s):
                                        </td>
                                        <td className="px-3 py-3 text-right font-bold text-indigo-700">{fmtMoney(kpis.valor_total)}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {/* Paginação */}
                {dataSelecionada && produtos.links && (
                    <nav className="flex justify-between items-center mt-4 text-sm">
                        <div className="text-gray-500">
                            {obraSel && (
                                <>
                                    Obra: <strong>{obraSel.codigo_obra}</strong> · {obraSel.nome_fantasia}
                                </>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {produtos.prev_page_url && (
                                <Link href={produtos.prev_page_url} preserveScroll
                                      className="px-3 py-1 bg-white border rounded hover:bg-gray-50">‹ Anterior</Link>
                            )}
                            <span className="px-3 py-1 text-gray-500">
                                Página {produtos.current_page} de {produtos.last_page}
                            </span>
                            {produtos.next_page_url && (
                                <Link href={produtos.next_page_url} preserveScroll
                                      className="px-3 py-1 bg-white border rounded hover:bg-gray-50">Próximo ›</Link>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

/* ============ helpers de UI ============ */
function KpiCard({ label, value, color, icon }) {
    return (
        <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${color}`}>
                {icon ?? label[0]}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] uppercase text-gray-500 tracking-wide font-semibold">{label}</p>
                <p className="text-xl font-bold text-gray-800 tabular-nums truncate">{value}</p>
            </div>
        </div>
    );
}

function Th({ col, f, onSort, align, children }) {
    const ativo = f.sort === col;
    const seta = !ativo ? '' : (f.dir === 'asc' ? ' ↑' : ' ↓');
    return (
        <th onClick={() => onSort(col)}
            className={`px-3 py-3 font-semibold cursor-pointer select-none hover:text-indigo-700 ${
                align === 'right' ? 'text-right' : ''
            } ${ativo ? 'text-indigo-700' : ''}`}>
            {children}{seta}
        </th>
    );
}

function Linha({ p }) {
    const sit = p.situacao; // 'ok' | 'sem_min' | 'abaixo_min' | 'critico'
    const ehInativo = !p.ativo;
    return (
        <tr className={`hover:bg-gray-50 ${ehInativo ? 'opacity-60' : ''}`}>
            <td className="px-3 py-2 w-12">
                {p.imagem ? (
                    <img src={`/storage/${p.imagem}`} alt="" className="w-10 h-10 object-cover rounded border" />
                ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">📦</div>
                )}
            </td>
            <td className="px-3 py-2">
                <Link href={route('admin.estoque.produtos.show', p.id)}
                      className="font-medium text-gray-800 hover:text-indigo-700 hover:underline">
                    {p.nome}
                </Link>
                <div className="text-[11px] text-gray-500 font-mono">{p.sku}</div>
                {ehInativo && <span className="text-[10px] text-rose-700">inativo</span>}
            </td>
            <td className="px-3 py-2 text-gray-600 text-xs">{p.categoria ?? '—'}</td>
            <td className="px-3 py-2 text-right tabular-nums">
                <strong>{fmtNumero(p.quantidade)}</strong>{' '}
                <span className="text-[11px] text-gray-500">{p.unidade}</span>
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                {p.estoque_minimo === null || p.estoque_minimo === undefined
                    ? <span className="text-gray-400 italic">não inf.</span>
                    : fmtNumero(p.estoque_minimo)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(p.valor_medio)}</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtMoney(p.valor_total)}</td>
            <td className="px-3 py-2 text-xs text-gray-600">{fmtUltima(p.ultima_movimentacao_at)}</td>
            <td className="px-3 py-2 text-right">
                <SituacaoBadge sit={sit} />
            </td>
        </tr>
    );
}

function SituacaoBadge({ sit }) {
    const map = {
        ok:         { cor: 'bg-emerald-100 text-emerald-700', label: '🟢 OK' },
        sem_min:    { cor: 'bg-gray-100 text-gray-600',       label: '⚪ Sem mín.' },
        abaixo_min: { cor: 'bg-amber-100 text-amber-700',     label: '🟠 Abaixo' },
        critico:    { cor: 'bg-rose-100 text-rose-700',       label: '🔴 Crítico' },
    };
    const c = map[sit] ?? map.ok;
    return <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${c.cor}`}>{c.label}</span>;
}

/* ============ formatadores ============ */
const fmtMoney = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNumero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtUltima = (d) => {
    if (!d) return <span className="text-gray-400 italic">nunca</span>;
    const dt = new Date(d);
    const diff = Math.floor((Date.now() - dt.getTime()) / 86400000);
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'ontem';
    if (diff < 30)  return `${diff} dias atrás`;
    if (diff < 365) return `${Math.floor(diff / 30)} meses atrás`;
    return dt.toLocaleDateString('pt-BR');
};
