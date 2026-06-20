// resources/js/Pages/Admin/Estoque/Relatorios/TopProdutos.jsx
// -----------------------------------------------------------------------------
// Relatório: top 50 produtos mais movimentados. Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FiltrosCard, moeda, numero } from './_filtros';

export default function TopProdutos({ linhas, tipo, totais, obras, filtros }) {
    return (
        <AuthenticatedLayout>
            <Head title="Top produtos" />
            <div className="p-6 w-full max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Top produtos</h1>
                        <p className="text-sm text-gray-500">
                            Top 50 produtos mais movimentados em <strong>{tipoLabel(tipo)}</strong>.
                            Período: {filtros.data_de} a {filtros.data_ate}.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.relatorios.hub')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                <FiltrosCard
                    rota="admin.estoque.relatorios.top-produtos"
                    obras={obras} filtros={filtros}
                    extras={({ f, setF }) => (
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-700">Tipo:</label>
                            <select
                                value={f.tipo || 'SAIDA'}
                                onChange={(e) => setF({ ...f, tipo: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                <option value="SAIDA">Apenas saídas (consumo)</option>
                                <option value="ENTRADA">Apenas entradas (compras)</option>
                                <option value="AMBOS">Entradas + saídas</option>
                            </select>
                        </div>
                    )}
                />

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <KpiCard label="Movimentações" value={totais.movs_total} />
                    <KpiCard label="Qtd total" value={numero(totais.qtd_total)} />
                    <KpiCard label="Valor total" value={moeda(totais.valor_total)} destaque />
                </div>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2 w-12">#</th>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2">Categoria</th>
                                <th className="px-4 py-2 text-right">Qtd</th>
                                <th className="px-4 py-2 text-right">Movs</th>
                                <th className="px-4 py-2 text-right">Valor total</th>
                                <th className="px-4 py-2 w-48">% do top 1</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {linhas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-trophy text-3xl text-gray-300 mb-2 block" />
                                        Nenhuma movimentação no período.
                                    </td>
                                </tr>
                            ) : linhas.map((l, i) => (
                                <tr key={l.produto_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                                            i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            {l.produto?.imagem ? (
                                                <img src={`/storage/${l.produto.imagem}`} alt="" className="w-8 h-8 rounded object-cover border" />
                                            ) : (
                                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                    <i className="fa-solid fa-box" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-900 truncate max-w-[260px]">{l.produto?.nome}</div>
                                                <div className="text-[11px] text-gray-400 font-mono">{l.produto?.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">{l.produto?.categoria?.nome || '—'}</td>
                                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                        {numero(l.total_qtd)} {l.produto?.unidade}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-600">{l.total_movs}</td>
                                    <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">{moeda(l.total_valor)}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div className="bg-rise-600 h-full rounded-full" style={{ width: `${l.percentual}%` }} />
                                            </div>
                                            <span className="text-[11px] text-gray-600 w-12 text-right">{l.percentual}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function tipoLabel(tipo) {
    return { SAIDA: 'saídas', ENTRADA: 'entradas', AMBOS: 'movimentações' }[tipo] || 'movimentações';
}

function KpiCard({ label, value, destaque = false }) {
    return (
        <div className={`bg-white border rounded-lg p-3 ${destaque ? 'border-emerald-300' : ''}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${destaque ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
        </div>
    );
}
