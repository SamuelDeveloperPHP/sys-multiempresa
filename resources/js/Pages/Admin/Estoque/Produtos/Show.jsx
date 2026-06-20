// resources/js/Pages/Admin/Estoque/Produtos/Show.jsx
// -----------------------------------------------------------------------------
// Detalhe do produto: foto, dados, QR do SKU, saldos por obra. Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link } from '@inertiajs/react';
import { QRCodeCanvas } from 'qrcode.react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ProdutoShow({ produto, saldos, saldoTotal, valorTotal }) {
    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

    return (
        <AuthenticatedLayout>
            <Head title={`Produto: ${produto.nome}`} />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {produto.nome}
                            {!produto.ativo && (
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                    Inativo
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 font-mono">SKU: {produto.sku}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.estoque.produtos.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            ← Voltar
                        </Link>
                        <Link
                            href={route('admin.estoque.produtos.edit', produto.id)}
                            className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700 text-sm"
                        >
                            <i className="fa-solid fa-pen-to-square mr-1" />
                            Editar
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna esquerda — Foto + QR */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-lg border p-4">
                            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                                {produto.imagem ? (
                                    <img
                                        src={`/storage/${produto.imagem}`}
                                        alt={produto.nome}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <i className="fa-solid fa-box text-6xl" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">QR do SKU</h3>
                            <div className="flex flex-col items-center bg-gray-50 rounded-lg p-4">
                                <QRCodeCanvas value={produto.sku} size={140} level="M" includeMargin={false} />
                                <p className="mt-2 text-xs font-mono text-gray-600">{produto.sku}</p>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2 text-center">
                                Aponte a câmera do app para identificar o produto.
                            </p>
                        </div>

                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo do estoque</h3>
                            <Linha label="Saldo total" valor={`${numero(saldoTotal)} ${produto.unidade}`} bold />
                            <Linha label="Valor em estoque" valor={moeda(valorTotal)} />
                            <Linha label="Mínimo configurado" valor={`${numero(produto.estoque_minimo)} ${produto.unidade}`} />
                            {produto.estoque_maximo && (
                                <Linha label="Máximo configurado" valor={`${numero(produto.estoque_maximo)} ${produto.unidade}`} />
                            )}
                        </div>
                    </div>

                    {/* Coluna direita — Dados + saldos por obra */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-lg border p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Dados do produto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <Linha label="Categoria" valor={produto.categoria?.nome || '—'} />
                                <Linha label="Marca" valor={produto.marca || '—'} />
                                <Linha label="Unidade" valor={produto.unidade} />
                                <Linha label="Código de barras" valor={produto.codigo_barras || '—'} mono />
                                <Linha label="Valor unitário" valor={moeda(produto.valor_unitario)} />
                                <Linha label="Última entrada" valor={produto.valor_ultima_entrada ? moeda(produto.valor_ultima_entrada) : '—'} />
                                <Linha label="Peso" valor={produto.peso_kg ? `${numero(produto.peso_kg)} kg` : '—'} />
                                <Linha label="Fornecedor padrão" valor={produto.fornecedor_padrao?.razao_social || '—'} />
                            </div>
                            {produto.descricao && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-gray-500 mb-1">Descrição</p>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{produto.descricao}</p>
                                </div>
                            )}
                        </div>

                        {/* Variações (EPI / calçado / EPC / uniforme) */}
                        {produto.controla_variacao && (
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    🦺 Variações
                                    <span className="text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                        {TIPO_LABEL[produto.tipo_item] ?? produto.tipo_item}
                                    </span>
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <GrupoVariacao titulo="Cores" valores={produto.cores} />
                                    <GrupoVariacao titulo="Tamanhos numéricos" valores={produto.tamanhos_numericos} />
                                    <GrupoVariacao titulo="Tamanhos de vestuário" valores={produto.tamanhos_vestuario} />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t">
                                    O saldo por cor/tamanho, CA, lote e validade são gerenciados na entrada e saída do estoque.
                                </p>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow border overflow-hidden">
                            <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-700">Saldo por obra</h3>
                                <span className="text-xs text-gray-500">{saldos.length} obra(s) com estoque</span>
                            </div>
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-left text-gray-700">
                                    <tr>
                                        <th className="px-4 py-2">Obra</th>
                                        <th className="px-4 py-2 text-right">Quantidade</th>
                                        <th className="px-4 py-2 text-right">Valor médio</th>
                                        <th className="px-4 py-2 text-right">Valor total</th>
                                        <th className="px-4 py-2 text-center">Alerta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {saldos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-gray-500 py-8">
                                                <i className="fa-solid fa-cubes-stacked text-3xl text-gray-300 mb-2 block" />
                                                Sem movimentação registrada. Saldo zerado em todas as obras.
                                            </td>
                                        </tr>
                                    ) : saldos.map((s) => {
                                        const abaixo = Number(s.quantidade) < Number(produto.estoque_minimo || 0);
                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">
                                                    <div className="font-medium text-gray-900">{s.obra?.nome_fantasia || s.obra?.codigo_obra}</div>
                                                    {s.obra?.codigo_obra && s.obra?.nome_fantasia && (
                                                        <div className="text-[11px] text-gray-400">{s.obra.codigo_obra}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    {numero(s.quantidade)} {produto.unidade}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-600">{moeda(s.valor_medio)}</td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    {moeda(Number(s.quantidade) * Number(s.valor_medio))}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {abaixo ? (
                                                        <span className="bg-amber-100 text-amber-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                                            <i className="fa-solid fa-triangle-exclamation mr-1" />
                                                            Abaixo do mínimo
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-600 text-[11px]">
                                                            <i className="fa-solid fa-check" /> OK
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

const TIPO_LABEL = {
    material: 'Material comum',
    epi: 'EPI',
    calcado_seguranca: 'Calçado de segurança',
    epc: 'EPC',
    uniforme: 'Uniforme',
};

function GrupoVariacao({ titulo, valores }) {
    if (!valores || valores.length === 0) return null;
    return (
        <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-36 flex-shrink-0 pt-1">{titulo}</span>
            <div className="flex flex-wrap gap-1.5">
                {valores.map((v) => (
                    <span key={v} className="bg-gray-100 border border-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                        {v}
                    </span>
                ))}
            </div>
        </div>
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
