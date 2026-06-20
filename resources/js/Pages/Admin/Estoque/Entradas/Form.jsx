import { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchSelect from '@/Components/SearchSelect';

/* ─────────────── constantes ─────────────── */
const TIPOS_ITEM = [
    { value: 'material',          label: 'Material comum',       icon: 'fa-box' },
    { value: 'epi',               label: 'EPI',                  icon: 'fa-helmet-safety' },
    { value: 'calcado_seguranca', label: 'Calçado de segurança', icon: 'fa-shoe-prints' },
    { value: 'epc',               label: 'EPC',                  icon: 'fa-shield-halved' },
    { value: 'uniforme',          label: 'Uniforme',             icon: 'fa-shirt' },
];
const TIPOS_COM_LOTE = ['epi', 'calcado_seguranca', 'epc', 'uniforme'];
const TAM_NUM  = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const TAM_VEST = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];

const norm = (s) => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function detectar(texto) {
    const n = norm(texto);
    if (/\bcalcad|botina|sapato|\bbota/.test(n)) return 'calcado_seguranca';
    if (/uniforme|vestuario|camisa|\bcalca|jaleco|macacao|camiseta/.test(n)) return 'uniforme';
    if (/\bepc\b|protecao coletiva|coletiv/.test(n)) return 'epc';
    if (/\bepi\b|protecao individual|oculos|capacete|\bluva|protetor|mascara|respirador|abafador/.test(n)) return 'epi';
    return null;
}
function inferirTipo(p) {
    if (!p) return 'material';
    if (p.tipo_item && p.tipo_item !== 'material') return p.tipo_item;
    return detectar(p.categoria?.nome ?? '') ?? detectar(p.nome ?? '') ?? 'material';
}
const isEpiTipo = (t) => TIPOS_COM_LOTE.includes(t);

const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const truncar = (s, n = 30) => (s && s.length > n ? s.slice(0, n) + '…' : (s ?? ''));

export default function EntradaForm({ obras, fornecedores, obra_atual = null, is_super = false }) {
    const { auth } = usePage().props;

    const { data, setData, post, processing, errors } = useForm({
        obra_id: obra_atual?.id ?? '', data_movimento: new Date().toISOString().slice(0, 10),
        fornecedor_id: '', nota_fiscal: '', data_nota_fiscal: '',
        itens: [],
    });

    const [carrinho, setCarrinho] = useState([]);
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const buscaRef = useRef(null);

    const opcoesObra = obras.map(o => ({ value: o.id, label: `${o.codigo_obra} — ${o.nome_fantasia}` }));
    const opcoesForn = fornecedores.map(f => ({
        value: f.id, label: f.razao_social,
        sub: f.nome_fantasia && f.nome_fantasia !== f.razao_social ? f.nome_fantasia : '',
    }));

    /* carrinho → form.itens */
    useEffect(() => {
        setData('itens', carrinho.map(i => ({
            produto_id: i.produto_id, tipo_item: i.tipo_item,
            quantidade: i.quantidade, valor_unitario: i.valor_unitario ?? 0,
            cor: i.cor || '', tamanho: i.tamanho || '',
            numero_ca: i.numero_ca || '', numero_lote: i.numero_lote || '',
            validade: i.validade || '', especificacao_tecnica: i.especificacao_tecnica || '',
            observacao: i.observacao || '',
        })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrinho]);

    /* busca */
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

    const adicionar = (p) => {
        const tipo = inferirTipo(p);
        const epi = isEpiTipo(tipo);
        setCarrinho(cur => {
            // material: mescla por produto; EPI: sempre nova linha (lotes distintos)
            if (!epi) {
                const idx = cur.findIndex(i => i.produto_id === p.id && !isEpiTipo(i.tipo_item));
                if (idx >= 0) { const c = [...cur]; c[idx] = { ...c[idx], quantidade: Number(c[idx].quantidade) + 1 }; return c; }
            }
            return [...cur, {
                produto_id: p.id, _nome: p.nome, _sku: p.sku, _unidade: p.unidade, _produtoSel: p,
                tipo_item: tipo, quantidade: 1, valor_unitario: p.valor_ultima_entrada ?? p.valor_unitario ?? 0,
                cor: '', tamanho: '', numero_ca: '', numero_lote: '', validade: '', especificacao_tecnica: '', observacao: '',
                _aberto: epi,
            }];
        });
        setQ(''); setResultados([]); focarBusca();
    };

    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (resultados[0]) adicionar(resultados[0]); } };

    const setItem = (idx, patch) => setCarrinho(cur => cur.map((i, k) => k === idx ? { ...i, ...patch } : i));
    const inc = (idx, d) => setCarrinho(cur => cur.map((i, k) => k === idx ? { ...i, quantidade: Math.max(0.001, Number(i.quantidade) + d) } : i));
    const remover = (idx) => setCarrinho(cur => cur.filter((_, k) => k !== idx));
    const limpar = () => setCarrinho([]);

    const totalGeral = carrinho.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);
    const podeSalvar = !processing && data.obra_id && carrinho.length > 0 && carrinho.every(i => Number(i.quantidade) > 0);

    const submit = (e) => { e.preventDefault(); post(route('admin.estoque.entradas.store')); };

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-sm';
    const epiInput = 'w-full border border-amber-300 bg-white rounded px-1.5 py-1 text-[11px]';

    return (
        <AuthenticatedLayout>
            <Head title="Novo recebimento (PDV)" />
            <form id="entrada-form" onSubmit={submit} className="p-4 w-full">
                <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-xl font-bold flex items-center gap-2"><span className="text-emerald-600">⬇</span> Novo recebimento</h1>
                    <div className="flex-1" />
                    <span className="text-xs text-gray-400"><i className="fa-solid fa-user mr-1" />{auth?.user?.email}</span>
                    <Link href={route('admin.estoque.entradas.index')} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    {/* ESQUERDA — itens (carrinho) */}
                    <div className="col-span-12 lg:col-span-5 bg-white border rounded-lg flex flex-col" style={{ minHeight: '70vh' }}>
                        <div className="px-3 py-2 border-b flex items-center justify-between">
                            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Itens do recebimento ({carrinho.length})</h2>
                            {carrinho.length > 0 && <button type="button" onClick={limpar} className="text-[11px] text-gray-400 hover:text-rose-600">limpar</button>}
                        </div>
                        {errors.itens && <p className="text-xs text-red-600 px-3 pt-2">{errors.itens}</p>}
                        <div className="flex-1 overflow-y-auto divide-y">
                            {carrinho.length === 0 ? (
                                <div className="text-center text-gray-400 py-12 text-xs">
                                    <i className="fa-solid fa-cart-shopping text-2xl mb-2 block text-gray-200" />
                                    Busque/escaneie ao lado para adicionar itens.
                                </div>
                            ) : carrinho.map((it, idx) => {
                                const epi = isEpiTipo(it.tipo_item);
                                const variacoes = it._produtoSel?.variacoes ?? [];
                                const cores = variacoes.filter(v => v.tipo === 'cor').map(v => v.valor);
                                const tn = variacoes.filter(v => v.tipo === 'tamanho_numerico').map(v => v.valor);
                                const tv = variacoes.filter(v => v.tipo === 'tamanho_vestuario').map(v => v.valor);
                                const tamSug = (tn.length || tv.length) ? [...tn, ...tv] : (it.tipo_item === 'uniforme' ? TAM_VEST : TAM_NUM);
                                return (
                                    <div key={idx} className="px-2.5 py-2">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-gray-800 leading-tight" title={it._nome}>{truncar(it._nome, 34)}</p>
                                                <span className="inline-block mt-0.5 text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{it._sku}</span>
                                            </div>
                                            <select value={it.tipo_item} onChange={(e) => setItem(idx, { tipo_item: e.target.value, _aberto: isEpiTipo(e.target.value) })}
                                                    className="border border-gray-200 rounded px-1 py-0.5 text-[10px] text-gray-600">
                                                {TIPOS_ITEM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                            <button type="button" onClick={() => remover(idx)} className="text-rose-400 hover:text-rose-600"><i className="fa-solid fa-trash text-[11px]" /></button>
                                        </div>

                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-0.5">
                                                <button type="button" onClick={() => inc(idx, -1)} className="w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs">−</button>
                                                <input type="number" step="0.001" min="0.001" value={it.quantidade}
                                                       onChange={(e) => setItem(idx, { quantidade: e.target.value })}
                                                       className="w-12 text-center border border-gray-200 rounded px-0.5 py-0.5 text-xs" />
                                                <button type="button" onClick={() => inc(idx, 1)} className="w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs">+</button>
                                                <span className="text-[10px] text-gray-400 ml-1">{it._unidade}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400">R$</span>
                                                <input type="number" step="0.01" min="0" value={it.valor_unitario}
                                                       onChange={(e) => setItem(idx, { valor_unitario: e.target.value })}
                                                       className="w-16 text-right border border-gray-200 rounded px-1 py-0.5 text-[11px] text-gray-600" />
                                                <span className="text-[13px] font-semibold text-gray-900 w-20 text-right">{moeda(Number(it.quantidade) * Number(it.valor_unitario))}</span>
                                            </div>
                                        </div>

                                        {/* Campos do lote (EPI) */}
                                        {epi && (
                                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 grid grid-cols-2 gap-1.5">
                                                <div>
                                                    <label className="block text-[9px] uppercase text-amber-700 font-semibold">Cor</label>
                                                    <input list={`cor-${idx}`} value={it.cor} onChange={(e) => setItem(idx, { cor: e.target.value })} placeholder="ex: Marrom" className={epiInput} />
                                                    <datalist id={`cor-${idx}`}>{cores.map(c => <option key={c} value={c} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase text-amber-700 font-semibold">Tamanho</label>
                                                    <input list={`tam-${idx}`} value={it.tamanho} onChange={(e) => setItem(idx, { tamanho: e.target.value })} placeholder="ex: 42" className={epiInput} />
                                                    <datalist id={`tam-${idx}`}>{tamSug.map(t => <option key={t} value={t} />)}</datalist>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase text-amber-700 font-semibold">C.A.</label>
                                                    <input value={it.numero_ca} onChange={(e) => setItem(idx, { numero_ca: e.target.value })} placeholder="ex: 12345" className={`${epiInput} font-mono`} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase text-amber-700 font-semibold">Nº lote</label>
                                                    <input value={it.numero_lote} onChange={(e) => setItem(idx, { numero_lote: e.target.value })} className={`${epiInput} font-mono`} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase text-amber-700 font-semibold">Validade</label>
                                                    <input type="date" value={it.validade} onChange={(e) => setItem(idx, { validade: e.target.value })} className={epiInput} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase text-amber-700 font-semibold">Espec. técnica</label>
                                                    <input value={it.especificacao_tecnica} onChange={(e) => setItem(idx, { especificacao_tecnica: e.target.value })} placeholder="material, solado…" className={epiInput} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="border-t p-3 flex justify-between text-sm font-bold text-gray-900">
                            <span>Total</span><span>{moeda(totalGeral)}</span>
                        </div>
                    </div>

                    {/* MEIO — busca + grade */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="flex items-center gap-2 border-2 border-emerald-200 rounded-lg px-3 py-2 bg-white focus-within:border-emerald-400 mb-3">
                            <i className="fa-solid fa-barcode text-emerald-500" />
                            <input ref={buscaRef} type="text" value={q} autoFocus onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
                                   placeholder="Escanear / buscar produto…  ↵ adiciona o 1º" className="flex-1 bg-transparent text-sm focus:outline-none" />
                            {buscando && <i className="fa-solid fa-spinner fa-spin text-gray-400" />}
                            {q && !buscando && <button type="button" onClick={() => { setQ(''); setResultados([]); }} className="text-gray-400 hover:text-gray-600">✕</button>}
                        </div>
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
                                    const epi = isEpiTipo(inferirTipo(p));
                                    return (
                                        <button key={p.id} type="button" onClick={() => adicionar(p)}
                                                className="text-left bg-white border rounded-lg p-2.5 hover:border-emerald-400 hover:shadow transition flex items-start gap-2">
                                            <i className={`fa-solid ${epi ? 'fa-helmet-safety text-amber-500' : 'fa-box text-gray-300'} text-lg mt-0.5`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-medium text-gray-800 leading-tight">{truncar(p.nome, 48)}</p>
                                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">{p.sku} · {p.unidade}{epi ? ' · EPI' : ''}</p>
                                            </div>
                                            <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">{moeda(p.valor_ultima_entrada || p.valor_unitario)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* DIREITA — dados do recebimento */}
                    <div className="col-span-12 lg:col-span-3">
                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 sticky top-4 space-y-3">
                            <h2 className="text-sm font-bold text-emerald-800">📋 Dados do recebimento</h2>
                            <div>
                                <label className="block text-xs font-medium text-emerald-800 mb-1">Obra *</label>
                                {is_super || !obra_atual ? (
                                    <SearchSelect sm options={opcoesObra} value={data.obra_id} onChange={(v) => setData('obra_id', v)} placeholder="— Selecionar obra —" />
                                ) : (
                                    <div className="w-full border border-gray-200 bg-white rounded px-2 py-1 text-sm text-gray-700 flex items-center gap-2">
                                        <i className="fa-solid fa-lock text-gray-400 text-xs" />{obra_atual.codigo_obra} — {obra_atual.nome_fantasia}
                                    </div>
                                )}
                                {errors.obra_id && <p className="text-xs text-red-600 mt-1">{errors.obra_id}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-emerald-800 mb-1">Data *</label>
                                <input type="date" max={new Date().toISOString().slice(0, 10)} value={data.data_movimento}
                                       onChange={(e) => setData('data_movimento', e.target.value)} className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-emerald-800 mb-1">Nº NF</label>
                                    <input type="text" maxLength={50} value={data.nota_fiscal} onChange={(e) => setData('nota_fiscal', e.target.value)} className={`${inputCls} font-mono`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-emerald-800 mb-1">Data NF</label>
                                    <input type="date" value={data.data_nota_fiscal} onChange={(e) => setData('data_nota_fiscal', e.target.value)} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-emerald-800 mb-1">Fornecedor</label>
                                <SearchSelect sm options={opcoesForn} value={data.fornecedor_id} onChange={(v) => setData('fornecedor_id', v)} placeholder="— Selecionar —" />
                            </div>
                            <div className="border-t border-emerald-200 pt-3">
                                <div className="flex justify-between text-sm font-bold text-gray-900 mb-2"><span>Total</span><span>{moeda(totalGeral)}</span></div>
                                <button type="submit" disabled={!podeSalvar}
                                        className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-bold disabled:opacity-50">
                                    {processing ? 'Salvando…' : `Salvar recebimento (${carrinho.length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
