import { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchSelect from '@/Components/SearchSelect';
import {
    FuncionarioRetiradaPicker, UsuarioRetiradaPicker, SenhaRetiradaModal,
    produtoControlaLote,
} from '../_shared/Pickers';

const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const truncar = (s, n = 28) => (s && s.length > n ? s.slice(0, n) + '…' : (s ?? ''));
const dataBR = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—');

export default function SaidaForm({ obras, obra_atual = null, is_super = false }) {
    const { auth } = usePage().props;

    const { data, setData, post, processing, errors } = useForm({
        obra_id: obra_atual?.id ?? '', data_movimento: new Date().toISOString().slice(0, 10),
        observacao: '',
        modo_retirante: 'funcionario', retirante_funcionario_id: '', retirante_user_id: '', retirante_senha: '',
        itens: [],
    });

    const [carrinho, setCarrinho] = useState([]);
    const [retiranteSel, setRetiranteSel] = useState(null);
    const [usuarioSel, setUsuarioSel]     = useState(null);
    const [senhaModal, setSenhaModal]     = useState(null);

    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [aviso, setAviso] = useState('');
    const buscaRef = useRef(null);

    const semSenha = data.modo_retirante === 'funcionario' && retiranteSel?.tem_senha === false;
    const opcoesObra = obras.map(o => ({ value: o.id, label: `${o.codigo_obra} — ${o.nome_fantasia}` }));

    /* carrinho → form.itens */
    useEffect(() => {
        setData('itens', carrinho.map(i => ({
            produto_id: i.produto_id, quantidade: i.quantidade,
            valor_unitario: i.valor_unitario ?? 0, lote_id: i.lote_id || null,
        })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrinho]);

    /* busca produtos (grade) */
    useEffect(() => {
        if (!q || q.length < 2) { setResultados([]); return; }
        setBuscando(true);
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-produtos'), { params: { q } })
                .then(r => setResultados(r.data.data || []))
                .finally(() => setBuscando(false));
        }, 200);
        return () => clearTimeout(t);
    }, [q]);

    const focarBusca = () => setTimeout(() => buscaRef.current?.focus(), 30);

    const adicionarProduto = async (p) => {
        setAviso('');
        const ehEpi = produtoControlaLote(p);

        if (ehEpi) {
            if (!data.obra_id) { setAviso('Selecione a obra antes de adicionar EPIs.'); return; }
            let lotes = [];
            try {
                const r = await axios.get(route('admin.estoque.movimentacoes.lotes'),
                    { params: { produto_id: p.id, obra_id: data.obra_id } });
                lotes = r.data.data || [];
            } catch { /* ignore */ }
            if (lotes.length === 0) { setAviso(`Sem lote disponível de "${truncar(p.nome, 40)}" nesta obra.`); return; }
            const fefo = lotes[0];
            setCarrinho(cur => {
                const idx = cur.findIndex(i => i.produto_id === p.id && i.lote_id === fefo.id);
                if (idx >= 0) { const c = [...cur]; c[idx] = { ...c[idx], quantidade: Number(c[idx].quantidade) + 1 }; return c; }
                return [...cur, {
                    produto_id: p.id, _nome: p.nome, _sku: p.sku, _unidade: p.unidade, _imagem: p.imagem, _ehEpi: true,
                    quantidade: 1, valor_unitario: fefo.valor_unitario || p.valor_unitario || 0, lote_id: fefo.id, lotes,
                }];
            });
        } else {
            setCarrinho(cur => {
                const idx = cur.findIndex(i => i.produto_id === p.id && !i._ehEpi);
                if (idx >= 0) { const c = [...cur]; c[idx] = { ...c[idx], quantidade: Number(c[idx].quantidade) + 1 }; return c; }
                return [...cur, {
                    produto_id: p.id, _nome: p.nome, _sku: p.sku, _unidade: p.unidade, _imagem: p.imagem, _ehEpi: false,
                    quantidade: 1, valor_unitario: p.valor_ultima_entrada ?? p.valor_unitario ?? 0, lote_id: null, lotes: [],
                }];
            });
        }
        setQ(''); setResultados([]); focarBusca();
    };

    const onKeyBusca = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (resultados[0]) adicionarProduto(resultados[0]); }
    };

    const setItem = (idx, patch) => setCarrinho(cur => cur.map((i, k) => k === idx ? { ...i, ...patch } : i));
    const inc = (idx, d) => setCarrinho(cur => cur.map((i, k) => k === idx ? { ...i, quantidade: Math.max(0.001, Number(i.quantidade) + d) } : i));
    const trocarLote = (idx, loteId) => setCarrinho(cur => cur.map((i, k) => {
        if (k !== idx) return i;
        const lote = i.lotes.find(l => l.id === Number(loteId));
        return { ...i, lote_id: Number(loteId), valor_unitario: lote?.valor_unitario || i.valor_unitario };
    }));
    const remover = (idx) => setCarrinho(cur => cur.filter((_, k) => k !== idx));
    const limpar  = () => setCarrinho([]);

    const loteDe = (i) => i.lotes?.find(l => l.id === i.lote_id);
    const excede = (i) => { const l = loteDe(i); return l && Number(i.quantidade) > Number(l.quantidade_atual); };
    const algumExcede = carrinho.some(excede);

    const totalQtd   = carrinho.reduce((s, i) => s + Number(i.quantidade || 0), 0);
    const totalGeral = carrinho.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);
    const temRetirante = !!(data.retirante_funcionario_id || data.retirante_user_id);
    const podeSalvar = !processing && data.obra_id && carrinho.length > 0 && temRetirante && data.retirante_senha && !semSenha && !algumExcede;

    const submit = (e) => { e.preventDefault(); post(route('admin.estoque.saidas.store')); };

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-sm';

    return (
        <AuthenticatedLayout>
            <Head title="Nova saída (PDV)" />
            <form id="saida-form" onSubmit={submit} className="p-4 w-full">
                {/* Barra superior: obra + data + voltar */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-72">
                        {is_super || !obra_atual ? (
                            <SearchSelect sm options={opcoesObra} value={data.obra_id}
                                          onChange={(v) => setData('obra_id', v)} placeholder="🏠 Selecionar obra…" />
                        ) : (
                            <div className="border border-gray-200 bg-white rounded px-2 py-1.5 text-sm text-gray-700 flex items-center gap-2">
                                <i className="fa-solid fa-warehouse text-gray-400 text-xs" />{obra_atual.codigo_obra} — {obra_atual.nome_fantasia}
                            </div>
                        )}
                        {errors.obra_id && <p className="text-xs text-red-600 mt-1">{errors.obra_id}</p>}
                    </div>
                    <input type="date" max={new Date().toISOString().slice(0, 10)} value={data.data_movimento}
                           onChange={(e) => setData('data_movimento', e.target.value)}
                           className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    <div className="flex-1" />
                    <span className="text-xs text-gray-400"><i className="fa-solid fa-user mr-1" />{auth?.user?.email}</span>
                    <Link href={route('admin.estoque.saidas.index')}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    {/* ESQUERDA — itens selecionados (tabela PDV) */}
                    <div className="col-span-12 lg:col-span-5 bg-white border rounded-lg flex flex-col" style={{ minHeight: '70vh' }}>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-white border-b z-10">
                                    <tr className="text-left text-[11px] uppercase text-gray-500 tracking-wide">
                                        <th className="px-3 py-2.5 font-bold">Produto</th>
                                        <th className="px-2 py-2.5 font-bold text-center">Qtd</th>
                                        <th className="px-2 py-2.5 font-bold text-right">Preço</th>
                                        <th className="px-2 py-2.5 font-bold text-right">Subtotal</th>
                                        <th className="px-2 py-2.5 w-8" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {carrinho.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center text-gray-400 py-12 text-xs">
                                            <i className="fa-solid fa-cart-shopping text-2xl mb-2 block text-gray-200" />
                                            Nenhum item. Busque/escaneie ao lado.
                                        </td></tr>
                                    ) : carrinho.map((it, idx) => {
                                        const lote = loteDe(it);
                                        const over = excede(it);
                                        return (
                                            <tr key={idx} className="align-top">
                                                <td className="px-3 py-2.5">
                                                    <p className="text-[13px] font-bold text-gray-800 leading-tight" title={it._nome}>{truncar(it._nome, 32)}</p>
                                                    <span className="inline-block mt-1 text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{it._sku}</span>
                                                    {it._ehEpi && (
                                                        <select value={it.lote_id} onChange={(e) => trocarLote(idx, e.target.value)}
                                                                className="block w-full mt-1 border border-amber-200 bg-amber-50 rounded px-1 py-0.5 text-[10px]">
                                                            {it.lotes.map(l => (
                                                                <option key={l.id} value={l.id}>
                                                                    {(l.numero_lote || `#${l.id}`)}{l.variante_rotulo ? ` · ${l.variante_rotulo}` : ''}{l.numero_ca ? ` · CA ${l.numero_ca}` : ''} · {numero(l.quantidade_atual)} disp
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {over && <p className="text-[10px] text-rose-600 mt-0.5">Excede o saldo ({numero(lote.quantidade_atual)} disp).</p>}
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button type="button" onClick={() => inc(idx, -1)}
                                                                className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold">−</button>
                                                        <input type="number" step="0.001" min="0.001" value={it.quantidade}
                                                               onChange={(e) => setItem(idx, { quantidade: e.target.value })}
                                                               className={`w-12 text-center border rounded px-0.5 py-1 text-xs ${over ? 'border-rose-400 bg-rose-50' : 'border-gray-200'}`} />
                                                        <button type="button" onClick={() => inc(idx, 1)}
                                                                className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold">+</button>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2.5 text-right text-gray-600 whitespace-nowrap">{moeda(it.valor_unitario)}</td>
                                                <td className="px-2 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{moeda(Number(it.quantidade) * Number(it.valor_unitario))}</td>
                                                <td className="px-2 py-2.5 text-center">
                                                    <button type="button" onClick={() => remover(idx)} className="text-rose-400 hover:text-rose-600"><i className="fa-solid fa-trash text-[11px]" /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* totais */}
                        <div className="border-t p-3 space-y-0.5 text-xs">
                            <div className="flex justify-between text-gray-500"><span>Qtd total</span><span>{numero(totalQtd)}</span></div>
                            <div className="flex justify-between text-sm font-bold text-gray-900"><span>Total</span><span>{moeda(totalGeral)}</span></div>
                            {carrinho.length > 0 && (
                                <button type="button" onClick={limpar}
                                        className="w-full mt-1.5 px-2 py-1 border border-gray-300 rounded text-[11px] text-gray-600 hover:bg-gray-50">
                                    <i className="fa-solid fa-rotate-left mr-1" /> Limpar carrinho
                                </button>
                            )}
                        </div>
                    </div>

                    {/* MEIO — busca + grade de produtos */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="flex items-center gap-2 border-2 border-red-200 rounded-lg px-3 py-2 bg-white focus-within:border-red-400 mb-3">
                            <i className="fa-solid fa-barcode text-red-400" />
                            <input ref={buscaRef} type="text" value={q} autoFocus
                                   onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyBusca}
                                   placeholder="Escanear / buscar produto por nome, SKU ou código…  ↵ adiciona o 1º"
                                   className="flex-1 bg-transparent text-sm focus:outline-none" />
                            {buscando && <i className="fa-solid fa-spinner fa-spin text-gray-400" />}
                            {q && !buscando && <button type="button" onClick={() => { setQ(''); setResultados([]); }} className="text-gray-400 hover:text-gray-600">✕</button>}
                        </div>

                        {aviso && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-3">{aviso}</p>}
                        {errors.itens && <p className="text-xs text-red-600 mb-2">{errors.itens}</p>}

                        {q.length < 2 ? (
                            <div className="text-center text-gray-400 py-20 border-2 border-dashed border-gray-200 rounded-lg">
                                <i className="fa-solid fa-magnifying-glass text-3xl mb-2 block text-gray-200" />
                                Digite ou escaneie para ver os produtos.
                            </div>
                        ) : resultados.length === 0 && !buscando ? (
                            <div className="text-center text-gray-400 py-16">Nenhum produto encontrado.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {resultados.map(p => {
                                    const epi = produtoControlaLote(p);
                                    return (
                                        <button key={p.id} type="button" onClick={() => adicionarProduto(p)}
                                                className="text-left bg-white border rounded-lg p-2.5 hover:border-red-400 hover:shadow transition flex items-start gap-2">
                                            <i className={`fa-solid ${epi ? 'fa-helmet-safety text-amber-500' : 'fa-box text-gray-300'} text-lg mt-0.5`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-medium text-gray-800 leading-tight">{truncar(p.nome, 48)}</p>
                                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">{p.sku} · {p.unidade}{epi ? ' · EPI' : ''}</p>
                                            </div>
                                            <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
                                                {moeda(p.valor_ultima_entrada || p.valor_unitario)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* DIREITA — dados do funcionário / retirada */}
                    <div className="col-span-12 lg:col-span-3">
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 sticky top-4 space-y-3">
                            <h2 className="text-sm font-bold text-red-800 flex items-center gap-2">🛡 Dados da retirada</h2>

                            <div className="flex gap-2 text-[11px]">
                                <button type="button"
                                        onClick={() => { setData(d => ({ ...d, modo_retirante: 'funcionario', retirante_user_id: '', retirante_senha: '' })); setUsuarioSel(null); }}
                                        className={`flex-1 px-2 py-1.5 rounded-full font-semibold ${data.modo_retirante === 'funcionario' ? 'bg-red-600 text-white' : 'bg-white text-red-700 border border-red-300'}`}>
                                    👷 Funcionário
                                </button>
                                <button type="button"
                                        onClick={() => { setData(d => ({ ...d, modo_retirante: 'usuario', retirante_funcionario_id: '', retirante_senha: '' })); setRetiranteSel(null); }}
                                        className={`flex-1 px-2 py-1.5 rounded-full font-semibold ${data.modo_retirante === 'usuario' ? 'bg-red-600 text-white' : 'bg-white text-red-700 border border-red-300'}`}>
                                    🖥 Usuário
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-red-800 mb-1">
                                    {data.modo_retirante === 'funcionario' ? 'Funcionário retirante *' : 'Usuário retirante *'}
                                </label>
                                {data.modo_retirante === 'funcionario' ? (
                                    <FuncionarioRetiradaPicker selecionado={retiranteSel} obraId={data.obra_id || null}
                                        onChange={(f) => { setRetiranteSel(f); setData(d => ({ ...d, retirante_funcionario_id: f?.id || '', retirante_senha: '' })); }} />
                                ) : (
                                    <UsuarioRetiradaPicker selecionado={usuarioSel}
                                        onChange={(u) => { setUsuarioSel(u); setData(d => ({ ...d, retirante_user_id: u?.id || '', retirante_senha: '' })); }} />
                                )}
                                {(errors.retirante_funcionario_id || errors.retirante_user_id) && (
                                    <p className="text-xs text-red-600 mt-1">{errors.retirante_funcionario_id ?? errors.retirante_user_id}</p>
                                )}
                                {semSenha && (
                                    <div className="text-[11px] text-rose-700 bg-white border border-rose-200 rounded p-2 mt-2">
                                        ⚠ Sem senha.{' '}
                                        <button type="button" onClick={() => setSenhaModal({ modo: 'cadastrar' })} className="underline font-semibold">Cadastrar</button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-red-800 mb-1">Senha *</label>
                                <input type="password" value={data.retirante_senha} autoComplete="new-password"
                                       onChange={(e) => setData('retirante_senha', e.target.value)}
                                       disabled={semSenha || (!data.retirante_funcionario_id && !data.retirante_user_id)}
                                       placeholder={semSenha ? 'Sem senha' : '••••••••'}
                                       className={`${inputCls} disabled:bg-gray-100`} />
                                {errors.retirante_senha && <p className="text-xs text-red-600 mt-1">{errors.retirante_senha}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-red-800 mb-1">Observação</label>
                                <input type="text" maxLength={1000} value={data.observacao}
                                       onChange={(e) => setData('observacao', e.target.value)} className={inputCls} />
                            </div>

                            <div className="border-t border-red-200 pt-3">
                                <div className="flex justify-between text-sm font-bold text-gray-900 mb-2">
                                    <span>Total</span><span>{moeda(totalGeral)}</span>
                                </div>
                                <button type="submit" disabled={!podeSalvar}
                                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold disabled:opacity-50">
                                    {processing ? 'Registrando…' : `Finalizar saída (${carrinho.length})`}
                                </button>
                                {!podeSalvar && carrinho.length > 0 && !processing && (
                                    <p className="text-[11px] text-gray-500 text-center mt-1">
                                        {algumExcede ? 'Ajuste quantidades que excedem o saldo.' : 'Informe retirante e senha.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {senhaModal && retiranteSel && (
                <SenhaRetiradaModal funcionario={retiranteSel} modo={senhaModal.modo}
                    onClose={() => setSenhaModal(null)}
                    onSuccess={() => { setRetiranteSel(f => ({ ...f, tem_senha: true })); setSenhaModal(null); }} />
            )}
        </AuthenticatedLayout>
    );
}
