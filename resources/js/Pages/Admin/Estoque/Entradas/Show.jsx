import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const dataBR = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');

const TIPO_LABEL = {
    material: 'Material comum', epi: 'EPI', calcado_seguranca: 'Calçado de segurança',
    epc: 'EPC', uniforme: 'Uniforme',
};

export default function EntradaShow({ entrada }) {
    const p = entrada.produto ?? {};
    const lote = entrada.lote;
    const combo = entrada.variante
        ? [entrada.variante.cor, entrada.variante.tamanho].filter(Boolean).join(' · ')
        : null;
    const diasVenc = lote?.validade
        ? Math.ceil((new Date(lote.validade + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000)
        : null;

    return (
        <AuthenticatedLayout>
            <Head title={`Entrada #${entrada.id}`} />
            <div className="p-6 w-full max-w-5xl mx-auto">
                <header className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-emerald-600">⬇</span> Entrada #{String(entrada.id).padStart(6, '0')}
                        </h1>
                        <p className="text-sm text-gray-500">Detalhes do lançamento de entrada de estoque.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.estoque.entradas.index')}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                        <a href={route('admin.estoque.comprovantes.movimentacao', entrada.id)} target="_blank" rel="noreferrer"
                           className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">🖨 Comprovante</a>
                        <Link href={route('admin.estoque.entradas.edit', entrada.id)}
                              className="px-5 py-2 bg-rise-600 text-white rounded-lg hover:bg-rise-700 text-sm font-semibold">Editar</Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Imagem */}
                    <div className="lg:col-span-3">
                        <div className="bg-white border rounded-md p-4">
                            <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-2">
                                {p.imagem ? (
                                    <img src={`/storage/${p.imagem}`} alt="" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-center text-gray-400"><i className="fa-solid fa-box text-4xl mb-2 block" /><p className="text-sm">Sem imagem</p></div>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{p.sku} · {p.unidade}</p>
                            <span className="inline-block mt-2 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {TIPO_LABEL[p.tipo_item] ?? 'Material comum'}
                            </span>
                        </div>
                    </div>

                    {/* Dados */}
                    <div className={lote ? 'lg:col-span-6' : 'lg:col-span-9'}>
                        <div className="bg-white border rounded-md p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados da entrada</h3>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <KV label="Obra" value={entrada.obra ? `${entrada.obra.codigo_obra} — ${entrada.obra.nome_fantasia}` : '—'} />
                                <KV label="Data" value={dataBR(entrada.data_movimento)} />
                                <KV label="Quantidade" value={`${numero(entrada.quantidade)} ${p.unidade ?? ''}`} />
                                <KV label="Valor unitário" value={moeda(entrada.valor_unitario)} />
                                <KV label="Valor total" value={<strong className="text-emerald-700">{moeda(entrada.valor_total)}</strong>} />
                                {combo && <KV label="Variação" value={combo} />}
                                <KV label="Fornecedor" value={entrada.fornecedor?.razao_social ?? '—'} />
                                <KV label="Nota fiscal" value={entrada.nota_fiscal ? `${entrada.nota_fiscal}${entrada.data_nota_fiscal ? ' · ' + dataBR(entrada.data_nota_fiscal) : ''}` : '—'} />
                                <KV label="Cadastrado por" value={entrada.user_create ?? '—'} />
                                {entrada.user_edit && <KV label="Editado por" value={entrada.user_edit} />}
                            </dl>
                            {entrada.observacao && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Observação</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">{entrada.observacao}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* EPI / lote */}
                    {lote && (
                        <div className="lg:col-span-3">
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-md p-4">
                                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
                                    <i className="fa-solid fa-helmet-safety" /> Lote do EPI
                                </h3>
                                <dl className="space-y-2 text-sm">
                                    <KV amber label="C.A." value={lote.numero_ca || '—'} />
                                    <KV amber label="Nº do lote" value={lote.numero_lote || `#${lote.id}`} />
                                    <KV amber label="Validade" value={
                                        <>
                                            {dataBR(lote.validade)}
                                            {diasVenc !== null && diasVenc < 0 && <strong className="text-rose-700"> (vencido)</strong>}
                                            {diasVenc !== null && diasVenc >= 0 && diasVenc <= 30 && <strong className="text-amber-700"> (vence em {diasVenc}d)</strong>}
                                        </>
                                    } />
                                    <KV amber label="Saldo do lote" value={`${numero(lote.quantidade_atual)} de ${numero(lote.quantidade_inicial)}`} />
                                    {lote.especificacao_tecnica && <KV amber label="Especificação" value={lote.especificacao_tecnica} />}
                                </dl>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function KV({ label, value, amber = false }) {
    return (
        <div>
            <dt className={`text-[11px] uppercase tracking-wide font-semibold ${amber ? 'text-amber-700' : 'text-gray-400'}`}>{label}</dt>
            <dd className="text-gray-800">{value}</dd>
        </div>
    );
}
