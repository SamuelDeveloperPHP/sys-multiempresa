import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const dataBR = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');
const dthBR  = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

const TIPO_LABEL = { material: 'Material comum', epi: 'EPI', calcado_seguranca: 'Calçado de segurança', epc: 'EPC', uniforme: 'Uniforme' };
const METODO = { SENHA_FUNC: 'Senha pessoal do funcionário', SENHA: 'Senha do usuário do sistema', BIOMETRIA_FUNC: 'Biometria do funcionário', BIOMETRIA: 'Biometria (WebAuthn)' };

export default function SaidaShow({ saida }) {
    const p = saida.produto ?? {};
    const lote = saida.lote;
    const combo = saida.variante ? [saida.variante.cor, saida.variante.tamanho].filter(Boolean).join(' · ') : null;
    const rf = saida.retirante_funcionario;
    const retiranteNome = rf?.nome ?? saida.retirante?.name;

    return (
        <AuthenticatedLayout>
            <Head title={`Saída #${saida.id}`} />
            <div className="p-6 w-full max-w-5xl mx-auto">
                <header className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2"><span className="text-red-600">⬆</span> Saída #{String(saida.id).padStart(6, '0')}</h1>
                        <p className="text-sm text-gray-500">Detalhes da retirada de estoque.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.estoque.saidas.index')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                        <a href={route('admin.estoque.comprovantes.movimentacao', saida.id)} target="_blank" rel="noreferrer"
                           className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">🖨 Comprovante</a>
                        <Link href={route('admin.estoque.saidas.edit', saida.id)}
                              className="px-5 py-2 bg-rise-600 text-white rounded-lg hover:bg-rise-700 text-sm font-semibold">Editar</Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Imagem */}
                    <div className="lg:col-span-3">
                        <div className="bg-white border rounded-md p-4">
                            <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-2">
                                {p.imagem ? <img src={`/storage/${p.imagem}`} alt="" className="w-full h-full object-contain" />
                                          : <div className="text-center text-gray-400"><i className="fa-solid fa-box text-4xl mb-2 block" /><p className="text-sm">Sem imagem</p></div>}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{p.sku} · {p.unidade}</p>
                            <span className="inline-block mt-2 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{TIPO_LABEL[p.tipo_item] ?? 'Material'}</span>
                        </div>
                    </div>

                    {/* Dados */}
                    <div className={lote ? 'lg:col-span-6' : 'lg:col-span-9'}>
                        <div className="bg-white border rounded-md p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados da saída</h3>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <KV label="Obra" value={saida.obra ? `${saida.obra.codigo_obra} — ${saida.obra.nome_fantasia}` : '—'} />
                                <KV label="Data" value={dataBR(saida.data_movimento)} />
                                <KV label="Quantidade" value={`${numero(saida.quantidade)} ${p.unidade ?? ''}`} />
                                <KV label="Valor unitário" value={moeda(saida.valor_unitario)} />
                                <KV label="Valor total" value={<strong className="text-red-700">{moeda(saida.valor_total)}</strong>} />
                                {combo && <KV label="Variação" value={combo} />}
                                <KV label="Cadastrado por" value={saida.user_create ?? '—'} />
                                {saida.user_edit && <KV label="Editado por" value={saida.user_edit} />}
                            </dl>
                            {saida.observacao && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Observação</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">{saida.observacao}</p>
                                </div>
                            )}
                        </div>

                        {/* Retirante / validação */}
                        <div className="bg-white border rounded-md p-4 mt-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">🛡 Retirada e validação</h3>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <KV label="Retirante" value={retiranteNome ?? '—'} />
                                <KV label="Tipo" value={rf ? 'Funcionário (sem login)' : (saida.retirante ? 'Usuário do sistema' : '—')} />
                                {rf?.matricula && <KV label="Matrícula" value={rf.matricula} />}
                                {rf?.cpf && <KV label="CPF" value={rf.cpf} />}
                                <KV label="Método de validação" value={METODO[saida.validacao_method] ?? saida.validacao_method ?? '—'} />
                                <KV label="Validado em" value={dthBR(saida.validado_em)} />
                            </dl>
                        </div>
                    </div>

                    {/* EPI / lote */}
                    {lote && (
                        <div className="lg:col-span-3">
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-md p-4">
                                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3"><i className="fa-solid fa-helmet-safety" /> Lote do EPI</h3>
                                <dl className="space-y-2 text-sm">
                                    <KV amber label="C.A." value={lote.numero_ca || '—'} />
                                    <KV amber label="Nº do lote" value={lote.numero_lote || `#${lote.id}`} />
                                    <KV amber label="Validade" value={dataBR(lote.validade)} />
                                    <KV amber label="Saldo atual do lote" value={`${numero(lote.quantidade_atual)} de ${numero(lote.quantidade_inicial)}`} />
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
