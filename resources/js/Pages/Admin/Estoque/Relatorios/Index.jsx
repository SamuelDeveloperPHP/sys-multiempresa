// resources/js/Pages/Admin/Estoque/Relatorios/Index.jsx
// -----------------------------------------------------------------------------
// Hub de relatórios — 4 cards principais. Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const RELATORIOS = [
    {
        nome: 'Consumo por obra',
        descricao: 'Saídas agregadas por obra e produto no período. Identifique onde o material está sendo mais consumido.',
        icon: 'fa-building',
        cor: 'bg-blue-50 border-blue-200 text-blue-700',
        rota: 'admin.estoque.relatorios.consumo-por-obra',
    },
    {
        nome: 'Top produtos',
        descricao: 'Produtos com maior volume movimentado no período. Útil para análise ABC e previsão de compras.',
        icon: 'fa-trophy',
        cor: 'bg-amber-50 border-amber-200 text-amber-700',
        rota: 'admin.estoque.relatorios.top-produtos',
    },
    {
        nome: 'Valor de estoque',
        descricao: 'Snapshot do valor parado em estoque agrupado por obra ou categoria. Base para inventário contábil.',
        icon: 'fa-sack-dollar',
        cor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        rota: 'admin.estoque.relatorios.valor-estoque',
    },
    {
        nome: 'Giro de estoque',
        descricao: 'Índice de rotatividade (saídas ÷ saldo) e cobertura (dias de estoque) por produto. Identifica itens encalhados.',
        icon: 'fa-rotate',
        cor: 'bg-purple-50 border-purple-200 text-purple-700',
        rota: 'admin.estoque.relatorios.giro-estoque',
    },
];

export default function RelatoriosIndex() {
    return (
        <AuthenticatedLayout>
            <Head title="Relatórios de Estoque" />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Relatórios de Estoque</h1>
                    <p className="text-sm text-gray-500">
                        Análises gerenciais para tomada de decisão. Dados filtráveis por obra e período.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RELATORIOS.map((r) => (
                        <Link
                            key={r.rota}
                            href={route(r.rota)}
                            className={`block ${r.cor} border-2 rounded-lg p-5 hover:shadow-md transition`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white shadow rounded-full flex items-center justify-center">
                                    <i className={`fa-solid ${r.icon} text-xl`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-base mb-1">{r.nome}</h3>
                                    <p className="text-sm opacity-90">{r.descricao}</p>
                                    <p className="mt-3 text-xs font-semibold">
                                        Abrir →
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-6 bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-600">
                    <p><strong className="text-gray-800">Sobre os relatórios:</strong></p>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Todos respeitam a empresa atualmente selecionada (multi-tenant).</li>
                        <li>Períodos padrão: últimos 30 dias (configurável).</li>
                        <li>Cálculos rodam diretamente no banco com índices otimizados — funciona em volume de 100k+ produtos.</li>
                        <li>Tabelas mostram top 50–500 linhas. Exportação CSV planejada para próxima versão.</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
