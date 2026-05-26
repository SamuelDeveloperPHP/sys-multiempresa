// resources/js/Pages/Admin/Estoque/Relatorios/ConsumoPorObra.jsx
// -----------------------------------------------------------------------------
// Relatório: saídas agregadas por (obra, produto) no período. Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FiltrosCard, moeda, numero } from './_filtros';

export default function ConsumoPorObra({ linhas, totais, obras, filtros }) {
    return (
        <AuthenticatedLayout>
            <Head title="Consumo por obra" />
            <div className="p-6 w-full max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Consumo por obra</h1>
                        <p className="text-sm text-gray-500">
                            Saídas (consumo + transferência) agrupadas por obra e produto.
                            Período: {filtros.data_de} a {filtros.data_ate}.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.relatorios.hub')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                <FiltrosCard
                    rota="admin.estoque.relatorios.consumo-por-obra"
                    obras={obras} filtros={filtros}
                />

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <KpiCard label="Total movimentações" value={totais.movs_total} />
                    <KpiCard label="Qtd total" value={numero(totais.qtd_total)} />
                    <KpiCard label="Valor total" value={moeda(totais.valor_total)} destaque />
                    <KpiCard label="Obras" value={totais.obras_count} />
                    <KpiCard label="Produtos" value={totais.produtos_count} />
                </div>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Obra</th>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2 text-right">Qtd consumida</th>
                                <th className="px-4 py-2 text-right">Movimentações</th>
                                <th className="px-4 py-2 text-right">Valor total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {linhas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-chart-bar text-3xl text-gray-300 mb-2 block" />
                                        Nenhum consumo registrado nesse período.
                                    </td>
                                </tr>
                            ) : linhas.map((l, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        <div className="text-gray-900">{l.obra?.codigo_obra || '—'}</div>
                                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{l.obra?.nome_fantasia}</div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="font-medium text-gray-900 truncate max-w-[300px]">{l.produto?.nome}</div>
                                        <div className="text-[11px] text-gray-400 font-mono">{l.produto?.sku}</div>
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                        {numero(l.total_qtd)} {l.produto?.unidade}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-600">{l.total_movs}</td>
                                    <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">{moeda(l.total_valor)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {linhas.length > 0 && (
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={2} className="px-4 py-2 text-right">Total geral:</td>
                                    <td className="px-4 py-2 text-right">{numero(totais.qtd_total)}</td>
                                    <td className="px-4 py-2 text-right">{totais.movs_total}</td>
                                    <td className="px-4 py-2 text-right">{moeda(totais.valor_total)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                    {linhas.length === 500 && (
                        <p className="text-center text-xs text-amber-600 bg-amber-50 py-2 border-t">
                            Mostrando top 500 linhas. Use filtros (período menor ou obra específica) para resultados completos.
                        </p>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function KpiCard({ label, value, destaque = false }) {
    return (
        <div className={`bg-white border rounded-lg p-3 ${destaque ? 'border-emerald-300' : ''}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${destaque ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
        </div>
    );
}
