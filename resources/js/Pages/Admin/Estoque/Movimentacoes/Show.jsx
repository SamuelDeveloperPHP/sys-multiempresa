// resources/js/Pages/Admin/Estoque/Movimentacoes/Show.jsx
// -----------------------------------------------------------------------------
// Detalhe de uma movimentação. Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const COR = {
    ENTRADA:           { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', label: 'Entrada',           icon: 'fa-arrow-down' },
    SAIDA:             { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     label: 'Saída',             icon: 'fa-arrow-up' },
    TRANSF_OUT:        { bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700',  label: 'Transferência OUT', icon: 'fa-right-from-bracket' },
    TRANSF_IN:         { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',    label: 'Transferência IN',  icon: 'fa-right-to-bracket' },
    AJUSTE_INVENTARIO: { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   label: 'Ajuste inventário', icon: 'fa-scale-balanced' },
    DEVOLUCAO:         { bg: 'bg-purple-50',   border: 'border-purple-200',  text: 'text-purple-700',  label: 'Devolução',         icon: 'fa-rotate-left' },
};

export default function MovimentacaoShow({ movimentacao: m }) {
    const c = COR[m.tipo] || COR.ENTRADA;
    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    const dataFmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const excluir = () => {
        if (!confirm(`Excluir esta movimentação? O saldo será recalculado.${m.tipo.startsWith('TRANSF') ? '\n\nO par também será removido.' : ''}`)) return;
        router.delete(route('admin.estoque.movimentacoes.destroy', m.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Movimentação #${m.id}`} />
            <div className="p-6 w-full max-w-5xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Movimentação #{m.id}</h1>
                        <p className="text-sm text-gray-500">
                            Lançada em {new Date(m.created_at).toLocaleString('pt-BR')} por {m.user_create || '—'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.estoque.movimentacoes.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            ← Voltar
                        </Link>
                        <button
                            type="button"
                            onClick={excluir}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                            <i className="fa-solid fa-trash mr-1" />
                            Excluir
                        </button>
                    </div>
                </header>

                {/* Hero do tipo */}
                <div className={`${c.bg} ${c.border} border-2 rounded-lg p-5 mb-6 flex items-center gap-4`}>
                    <div className={`w-14 h-14 rounded-full ${c.text} bg-white shadow flex items-center justify-center`}>
                        <i className={`fa-solid ${c.icon} text-2xl`} />
                    </div>
                    <div className="flex-1">
                        <p className={`text-lg font-bold ${c.text}`}>{c.label}</p>
                        <p className="text-sm text-gray-700">
                            {numero(m.quantidade)} {m.produto?.unidade} de <strong>{m.produto?.nome}</strong>
                        </p>
                        <p className="text-xs text-gray-500">
                            {m.tipo.startsWith('TRANSF') && m.obra_contraparte
                                ? `${m.obra?.codigo_obra || m.obra?.nome}  ${m.tipo === 'TRANSF_OUT' ? '→' : '←'}  ${m.obra_contraparte?.codigo_obra || m.obra_contraparte?.nome}`
                                : `Obra: ${m.obra?.codigo_obra || m.obra?.nome}`}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{moeda(m.valor_total)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* PRODUTO */}
                    <div className="lg:col-span-1 bg-white rounded-lg border p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Produto</h3>
                        <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                            {m.produto?.imagem ? (
                                <img src={`/storage/${m.produto.imagem}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <i className="fa-solid fa-box text-5xl" />
                                </div>
                            )}
                        </div>
                        <p className="font-semibold text-gray-900">{m.produto?.nome}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">SKU: {m.produto?.sku}</p>
                        <Link
                            href={route('admin.estoque.produtos.show', m.produto.id)}
                            className="block mt-3 text-center text-xs text-rise-600 hover:underline"
                        >
                            Ver detalhes do produto →
                        </Link>
                    </div>

                    {/* DADOS */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-lg border p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Dados da movimentação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <Linha label="Data" valor={dataFmt(m.data_movimento)} />
                                <Linha label="Tipo" valor={c.label} />
                                <Linha label="Quantidade" valor={`${numero(m.quantidade)} ${m.produto?.unidade}`} bold />
                                <Linha label="Valor unitário" valor={moeda(m.valor_unitario)} />
                                <Linha label="Valor total" valor={moeda(m.valor_total)} bold />
                                <Linha label="Obra" valor={m.obra?.codigo_obra ? `${m.obra.codigo_obra} — ${m.obra.nome}` : m.obra?.nome || '—'} />
                                {m.tipo.startsWith('TRANSF') && m.obra_contraparte && (
                                    <Linha
                                        label={m.tipo === 'TRANSF_OUT' ? 'Obra destino' : 'Obra origem'}
                                        valor={m.obra_contraparte.codigo_obra ? `${m.obra_contraparte.codigo_obra} — ${m.obra_contraparte.nome}` : m.obra_contraparte.nome || '—'}
                                    />
                                )}
                            </div>
                            {m.observacao && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-gray-500 mb-1">Observação</p>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.observacao}</p>
                                </div>
                            )}
                        </div>

                        {(m.fornecedor || m.nota_fiscal) && (
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Nota fiscal / fornecedor</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    <Linha label="Fornecedor" valor={m.fornecedor ? (m.fornecedor.nome_fantasia || m.fornecedor.razao_social) : '—'} />
                                    <Linha label="Nº NF" valor={m.nota_fiscal || '—'} mono />
                                    {m.data_nota_fiscal && <Linha label="Data NF" valor={dataFmt(m.data_nota_fiscal)} />}
                                </div>
                            </div>
                        )}

                        {m.movimentacao_par_id && m.par && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                                    <i className="fa-solid fa-link mr-1" />
                                    Par da transferência
                                </h3>
                                <p className="text-sm text-blue-900">
                                    Esta movimentação está vinculada à{' '}
                                    <Link
                                        href={route('admin.estoque.movimentacoes.show', m.par.id)}
                                        className="font-semibold underline"
                                    >
                                        movimentação #{m.par.id} ({COR[m.par.tipo]?.label})
                                    </Link>. Excluir uma remove a outra.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Linha({ label, valor, bold = false, mono = false }) {
    return (
        <div className="flex items-baseline justify-between py-1">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-sm text-gray-900 ${bold ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''}`}>
                {valor}
            </span>
        </div>
    );
}
