// resources/js/Pages/Admin/Estoque/Relatorios/GiroEstoque.jsx
// -----------------------------------------------------------------------------
// Relatório: giro (rotatividade) + cobertura (dias de estoque). Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FiltrosCard, moeda, numero } from './_filtros';

export default function GiroEstoque({ linhas, dias, totais, obras, filtros }) {
    return (
        <AuthenticatedLayout>
            <Head title="Giro de estoque" />
            <div className="p-6 w-full max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Giro de estoque</h1>
                        <p className="text-sm text-gray-500">
                            Rotatividade dos produtos no período (saídas ÷ saldo atual) e dias de cobertura.
                            <span className="ml-2 text-gray-400">{dias} dias analisados.</span>
                        </p>
                    </div>
                    <Link href={route('admin.estoque.relatorios.hub')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                <FiltrosCard
                    rota="admin.estoque.relatorios.giro-estoque"
                    obras={obras} filtros={filtros}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <KpiCard label="Produtos analisados" value={totais.produtos_count} />
                    <KpiCard label="Saídas no período" value={numero(totais.saidas_total)} />
                    <KpiCard label="Saldo atual" value={numero(totais.saldo_total)} />
                    <KpiCard label="Valor em estoque" value={moeda(totais.valor_total)} destaque />
                </div>

                <div className="bg-white rounded-lg shadow border overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2 text-right">Saídas ({dias}d)</th>
                                <th className="px-4 py-2 text-right">Saídas/dia</th>
                                <th className="px-4 py-2 text-right">Saldo atual</th>
                                <th className="px-4 py-2 text-right">Giro</th>
                                <th className="px-4 py-2 text-right">Cobertura (dias)</th>
                                <th className="px-4 py-2 text-center">Análise</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {linhas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-rotate text-3xl text-gray-300 mb-2 block" />
                                        Sem saídas no período para análise de giro.
                                    </td>
                                </tr>
                            ) : linhas.map((l) => (
                                <tr key={l.produto_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        <div className="font-medium text-gray-900 truncate max-w-[280px]">{l.nome}</div>
                                        <div className="text-[11px] text-gray-400 font-mono">{l.sku} · {l.unidade}</div>
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                        {numero(l.total_saidas)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-600">{numero(l.saidas_dia)}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">{numero(l.saldo_atual)}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                        {l.giro === null ? (
                                            <span className="text-gray-400">—</span>
                                        ) : (
                                            <span className={`font-semibold ${
                                                l.giro >= 1 ? 'text-emerald-600' :
                                                l.giro >= 0.3 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                                {l.giro.toFixed(2)}×
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                        {l.cobertura_dias === null ? (
                                            <span className="text-gray-400">—</span>
                                        ) : (
                                            <span className={
                                                l.cobertura_dias < 7 ? 'text-red-600 font-semibold' :
                                                l.cobertura_dias < 30 ? 'text-amber-600' : 'text-gray-700'
                                            }>
                                                {l.cobertura_dias} dias
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <Analise linha={l} dias={dias} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-900">
                    <p className="font-semibold mb-2">Como interpretar:</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li><strong>Giro</strong>: quantas vezes o estoque foi renovado no período. Maior = melhor (giro alto → produto sai).</li>
                        <li><strong>Cobertura</strong>: por quantos dias o saldo atual deve durar no ritmo de saídas. Muito alto = encalhado; muito baixo = risco de ruptura.</li>
                        <li><strong>Análise</strong>: combina os dois indicadores para classificar — 🟢 saudável, 🟡 atenção, 🔴 ação necessária.</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Analise({ linha, dias }) {
    const cob = linha.cobertura_dias;
    const giro = linha.giro;

    if (cob === null || giro === null) {
        return <span className="text-gray-400 text-xs">Sem dados</span>;
    }
    if (cob < 7) {
        return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-medium">⚠ Risco ruptura</span>;
    }
    if (giro >= 1 && cob <= 30) {
        return <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-medium">✓ Saudável</span>;
    }
    if (cob > 90) {
        return <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-medium">⚠ Encalhado</span>;
    }
    return <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-medium">~ Normal</span>;
}

function KpiCard({ label, value, destaque = false }) {
    return (
        <div className={`bg-white border rounded-lg p-3 ${destaque ? 'border-emerald-300' : ''}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${destaque ? 'text-emerald-700' : 'text-gray-900'}`}>{value}</p>
        </div>
    );
}
