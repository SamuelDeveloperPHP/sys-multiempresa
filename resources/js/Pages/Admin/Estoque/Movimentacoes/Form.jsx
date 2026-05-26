// resources/js/Pages/Admin/Estoque/Movimentacoes/Form.jsx
// -----------------------------------------------------------------------------
// Form unificado de movimentação. Padrão Rise. O tipo é selecionado no topo
// e os campos se adaptam (entrada mostra NF/fornecedor, transferência mostra
// obra destino, etc).
// -----------------------------------------------------------------------------

import { useEffect, useState, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const TIPOS = [
    { value: 'ENTRADA',    label: 'Entrada',         cor: 'emerald', icon: 'fa-arrow-down',  desc: 'Compra / recebimento / devolução de fornecedor' },
    { value: 'SAIDA',      label: 'Saída',           cor: 'red',     icon: 'fa-arrow-up',    desc: 'Consumo / baixa avulsa' },
    { value: 'TRANSF_OUT', label: 'Transferência',   cor: 'orange',  icon: 'fa-right-left',  desc: 'Movimentação entre obras (gera par OUT+IN)' },
    { value: 'DEVOLUCAO',  label: 'Devolução',       cor: 'purple',  icon: 'fa-rotate-left', desc: 'Retorno ao estoque (entrada)' },
];

export default function MovimentacaoForm({ tipoInicial, obras, fornecedores }) {
    const { data, setData, post, processing, errors } = useForm({
        tipo:             tipoInicial || 'ENTRADA',
        produto_id:       '',
        obra_id:          '',
        obra_destino_id:  '',
        quantidade:       '',
        valor_unitario:   '',
        data_movimento:   new Date().toISOString().slice(0, 10),
        observacao:       '',
        fornecedor_id:    '',
        nota_fiscal:      '',
        data_nota_fiscal: '',
        // FASE 7.A — validação de retirada (só SAIDA)
        retirante_user_id: '',
        retirante_senha:   '',
    });

    const tipoAtual = TIPOS.find((t) => t.value === data.tipo) || TIPOS[0];
    const isSaida = data.tipo === 'SAIDA';
    const [retiranteSel, setRetiranteSel] = useState(null);

    // Produto selecionado (com cache visual)
    const [produtoSel, setProdutoSel] = useState(null);
    const [saldoAtual, setSaldoAtual] = useState(null);

    // Atualiza saldo quando muda produto+obra (para SAIDA/TRANSF mostrar disponível)
    useEffect(() => {
        if (!data.produto_id || !data.obra_id) {
            setSaldoAtual(null);
            return;
        }
        let active = true;
        axios.get(route('admin.estoque.movimentacoes.saldo'), {
            params: { produto_id: data.produto_id, obra_id: data.obra_id },
        })
            .then((r) => { if (active) setSaldoAtual(r.data); })
            .catch(() => { if (active) setSaldoAtual(null); });
        return () => { active = false; };
    }, [data.produto_id, data.obra_id]);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.estoque.movimentacoes.store'));
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const isEntrada = ['ENTRADA', 'DEVOLUCAO'].includes(data.tipo);
    const isTransf  = data.tipo === 'TRANSF_OUT';

    return (
        <AuthenticatedLayout>
            <Head title={`Nova movimentação · ${tipoAtual.label}`} />
            <div className="p-6 w-full max-w-5xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Nova movimentação</h1>
                        <p className="text-sm text-gray-500">{tipoAtual.desc}</p>
                    </div>
                    <Link
                        href={route('admin.estoque.movimentacoes.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        ← Voltar
                    </Link>
                </header>

                {/* Seletor de tipo (tabs grandes) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
                    {TIPOS.map((t) => {
                        const ativo = data.tipo === t.value;
                        return (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setData('tipo', t.value)}
                                className={`flex items-center gap-2 px-3 py-3 rounded-lg border-2 text-sm font-semibold transition ${
                                    ativo
                                        ? `bg-${t.cor}-50 border-${t.cor}-500 text-${t.cor}-700`
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <i className={`fa-solid ${t.icon} text-lg`} />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLUNA PRINCIPAL */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* PRODUTO */}
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Produto</h3>
                            <ProdutoPicker
                                value={data.produto_id}
                                onChange={(p) => {
                                    setProdutoSel(p);
                                    setData('produto_id', p?.id || '');
                                    if (p?.valor_ultima_entrada && isEntrada && !data.valor_unitario) {
                                        setData('valor_unitario', p.valor_ultima_entrada);
                                    }
                                }}
                                selecionado={produtoSel}
                            />
                            {errors.produto_id && <p className="text-xs text-red-600 mt-2">{errors.produto_id}</p>}
                        </div>

                        {/* OBRA / TRANSFERÊNCIA */}
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                {isTransf ? 'Origem e destino' : 'Obra'}
                            </h3>
                            <div className={`grid ${isTransf ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                <Field label={isTransf ? 'Obra de origem *' : 'Obra *'} error={errors.obra_id}>
                                    <select
                                        value={data.obra_id}
                                        onChange={(e) => setData('obra_id', e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">— Selecione —</option>
                                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome}</option>)}
                                    </select>
                                </Field>
                                {isTransf && (
                                    <Field label="Obra de destino *" error={errors.obra_destino_id}>
                                        <select
                                            value={data.obra_destino_id}
                                            onChange={(e) => setData('obra_destino_id', e.target.value)}
                                            required
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                        >
                                            <option value="">— Selecione —</option>
                                            {obras.filter((o) => String(o.id) !== String(data.obra_id)).map((o) => (
                                                <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome}</option>
                                            ))}
                                        </select>
                                    </Field>
                                )}
                            </div>

                            {saldoAtual !== null && data.produto_id && data.obra_id && (
                                <div className={`mt-3 px-3 py-2 rounded text-xs ${
                                    saldoAtual.quantidade > 0 ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'
                                }`}>
                                    <i className="fa-solid fa-circle-info mr-1" />
                                    Saldo atual na obra origem:{' '}
                                    <strong>{Number(saldoAtual.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</strong>
                                    {' '}({moeda(saldoAtual.valor_medio)} PMP)
                                </div>
                            )}
                        </div>

                        {/* QUANTIDADE + VALOR + DATA */}
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados da movimentação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Quantidade *" error={errors.quantidade}>
                                    <input
                                        type="number" step="0.001" min="0.001" required
                                        value={data.quantidade}
                                        onChange={(e) => setData('quantidade', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                                <Field label="Valor unitário (R$)" error={errors.valor_unitario}>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={data.valor_unitario}
                                        onChange={(e) => setData('valor_unitario', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                                <Field label="Data *" error={errors.data_movimento}>
                                    <input
                                        type="date" required max={new Date().toISOString().slice(0, 10)}
                                        value={data.data_movimento}
                                        onChange={(e) => setData('data_movimento', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                            </div>

                            {data.quantidade && data.valor_unitario && (
                                <div className="mt-3 text-xs text-gray-500">
                                    Total estimado: <strong className="text-gray-900">
                                        {moeda(Number(data.quantidade) * Number(data.valor_unitario))}
                                    </strong>
                                </div>
                            )}
                        </div>

                        {/* NF / FORNECEDOR (só em entradas) */}
                        {isEntrada && (
                            <div className="bg-white rounded-lg border p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    Nota fiscal e fornecedor <span className="text-gray-400 font-normal">(opcional)</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Field label="Fornecedor" error={errors.fornecedor_id}>
                                        <select
                                            value={data.fornecedor_id}
                                            onChange={(e) => setData('fornecedor_id', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                        >
                                            <option value="">— Selecione —</option>
                                            {fornecedores.map((f) => (
                                                <option key={f.id} value={f.id}>{f.razao_social}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Número da NF" error={errors.nota_fiscal}>
                                        <input
                                            type="text" maxLength={50}
                                            value={data.nota_fiscal}
                                            onChange={(e) => setData('nota_fiscal', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                                        />
                                    </Field>
                                    <Field label="Data da NF" error={errors.data_nota_fiscal}>
                                        <input
                                            type="date"
                                            value={data.data_nota_fiscal}
                                            onChange={(e) => setData('data_nota_fiscal', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                        />
                                    </Field>
                                </div>
                            </div>
                        )}

                        {/* OBSERVAÇÃO */}
                        <div className="bg-white rounded-lg border p-4">
                            <Field label="Observação" error={errors.observacao}>
                                <textarea
                                    value={data.observacao}
                                    onChange={(e) => setData('observacao', e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </Field>
                        </div>

                        {/* ============= VALIDAÇÃO DO RETIRANTE (só SAÍDA) ============= */}
                        {isSaida && (
                            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-red-800 mb-1">
                                    <i className="fa-solid fa-shield-halved mr-1" />
                                    Validação de retirada — obrigatória
                                </h3>
                                <p className="text-xs text-red-700 mb-3">
                                    Identifique o funcionário que está retirando o material. Ele precisa confirmar com a própria senha.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field label="Funcionário retirante *" error={errors.retirante_user_id}>
                                        <FuncionarioPicker
                                            selecionado={retiranteSel}
                                            onChange={(u) => {
                                                setRetiranteSel(u);
                                                setData('retirante_user_id', u?.id || '');
                                                setData('retirante_senha', '');
                                            }}
                                        />
                                    </Field>
                                    <Field label="Senha do retirante *" error={errors.retirante_senha} hint="Digitada pelo próprio funcionário no momento da retirada">
                                        <input
                                            type="password"
                                            value={data.retirante_senha}
                                            onChange={(e) => setData('retirante_senha', e.target.value)}
                                            autoComplete="new-password"
                                            disabled={!data.retirante_user_id}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100"
                                            placeholder={data.retirante_user_id ? '••••••••' : 'Selecione o funcionário primeiro'}
                                        />
                                    </Field>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Link
                                href={route('admin.estoque.movimentacoes.index')}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className={`px-6 py-2 text-white rounded text-sm font-semibold disabled:opacity-50 bg-${tipoAtual.cor}-600 hover:bg-${tipoAtual.cor}-700`}
                            >
                                <i className={`fa-solid ${tipoAtual.icon} mr-1`} />
                                {processing ? 'Salvando…' : `Registrar ${tipoAtual.label.toLowerCase()}`}
                            </button>
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div className="lg:col-span-1">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 sticky top-4">
                            <h3 className="font-semibold mb-2 text-sm">
                                <i className="fa-solid fa-circle-info mr-1" />
                                Sobre {tipoAtual.label.toLowerCase()}
                            </h3>
                            <p className="leading-relaxed mb-2">{tipoAtual.desc}</p>

                            <hr className="my-3 border-blue-200" />
                            <p className="font-semibold mb-1">Lembre-se:</p>
                            <ul className="list-disc list-inside space-y-1 leading-relaxed">
                                {isEntrada && (
                                    <>
                                        <li>O saldo do produto na obra é atualizado automaticamente.</li>
                                        <li>O PMP (preço médio ponderado) recalcula com o valor unitário desta entrada.</li>
                                        <li>NF e fornecedor são opcionais mas recomendados para auditoria.</li>
                                    </>
                                )}
                                {data.tipo === 'SAIDA' && (
                                    <>
                                        <li>O sistema bloqueia se o saldo for insuficiente.</li>
                                        <li>Para baixa avulsa (não vinculada a requisição).</li>
                                    </>
                                )}
                                {isTransf && (
                                    <>
                                        <li>Cria DUAS movimentações vinculadas: OUT na origem e IN no destino.</li>
                                        <li>Origem e destino devem ser obras da mesma empresa.</li>
                                        <li>Excluir uma remove a outra automaticamente.</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

// =============================================================================
// Autocomplete de produto
// =============================================================================
function ProdutoPicker({ value, onChange, selecionado }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!q || q.length < 2) {
            setResultados([]);
            return;
        }
        setLoading(true);
        const timer = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-produtos'), { params: { q } })
                .then((r) => {
                    setResultados(r.data.data || []);
                    setAberto(true);
                })
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(timer);
    }, [q]);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const escolher = (p) => {
        onChange(p);
        setQ('');
        setAberto(false);
    };

    const limpar = () => {
        onChange(null);
        setQ('');
    };

    if (selecionado && value) {
        return (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                {selecionado.imagem ? (
                    <img src={`/storage/${selecionado.imagem}`} alt="" className="w-12 h-12 rounded object-cover border" />
                ) : (
                    <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-400">
                        <i className="fa-solid fa-box" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{selecionado.nome}</p>
                    <p className="text-xs text-gray-500 font-mono">{selecionado.sku} · {selecionado.unidade}</p>
                </div>
                <button type="button" onClick={limpar} className="text-gray-400 hover:text-red-600 px-2" title="Trocar">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Digite nome, SKU ou código de barras (mín. 2 caracteres)…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            {loading && (
                <div className="absolute right-3 top-2.5 text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin" />
                </div>
            )}
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-y-auto">
                    {resultados.map((p) => (
                        <li
                            key={p.id}
                            onClick={() => escolher(p)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                            {p.imagem ? (
                                <img src={`/storage/${p.imagem}`} alt="" className="w-8 h-8 rounded object-cover border" />
                            ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                    <i className="fa-solid fa-box" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">{p.nome}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{p.sku} · {p.unidade}</p>
                            </div>
                            <span className="text-xs text-gray-500">
                                {Number(p.valor_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {aberto && q.length >= 2 && resultados.length === 0 && !loading && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg px-3 py-3 text-sm text-gray-500">
                    Nenhum produto encontrado.
                </div>
            )}
        </div>
    );
}

function Field({ label, hint, error, children }) {
    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            {children}
            {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}

// =============================================================================
// Autocomplete de FUNCIONÁRIO (retirante) — usa /admin/estoque/movimentacoes/buscar-funcionarios
// =============================================================================
function FuncionarioPicker({ selecionado, onChange }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!q || q.length < 2) { setResultados([]); return; }
        setLoading(true);
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-funcionarios'), { params: { q } })
                .then((r) => { setResultados(r.data.data || []); setAberto(true); })
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const escolher = (u) => { onChange(u); setQ(''); setAberto(false); };
    const limpar = () => { onChange(null); setQ(''); };

    if (selecionado) {
        return (
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-300">
                <div className="w-8 h-8 rounded-full bg-rise-100 text-rise-700 flex items-center justify-center font-bold text-xs">
                    {selecionado.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selecionado.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{selecionado.email}</p>
                </div>
                <button type="button" onClick={limpar} className="text-gray-400 hover:text-red-600 px-1" title="Trocar">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome ou e-mail…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            {loading && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-3 text-gray-400" />}
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-72 overflow-y-auto">
                    {resultados.map((u) => (
                        <li key={u.id} onClick={() => escolher(u)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                            <div className="w-7 h-7 rounded-full bg-rise-100 text-rise-700 flex items-center justify-center font-bold text-xs">
                                {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">{u.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                            </div>
                            {u.type && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{u.type}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {aberto && q.length >= 2 && resultados.length === 0 && !loading && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg px-3 py-3 text-sm text-gray-500">
                    Nenhum funcionário encontrado.
                </div>
            )}
        </div>
    );
}
