// resources/js/Pages/Admin/Estoque/Requisicoes/Form.jsx
// -----------------------------------------------------------------------------
// Create/Edit de requisição (só em status RASCUNHO). Cabeçalho + lista
// dinâmica de itens com autocomplete de produto. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState, useRef, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function RequisicaoForm({ requisicao, obras }) {
    const isEdit = !!requisicao?.id;

    const itensIniciais = requisicao?.itens?.map((it) => ({
        produto_id: it.produto_id,
        produto: it.produto || null,
        quantidade_solicitada: it.quantidade_solicitada,
        valor_unitario_estimado: it.valor_unitario_estimado,
        observacao: it.observacao || '',
    })) || [];

    const { data, setData, post, put, processing, errors } = useForm({
        obra_origem_id: requisicao?.obra_origem_id ?? '',
        obra_destino_id: requisicao?.obra_destino_id ?? '',
        data_solicitacao: requisicao?.data_solicitacao?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
        observacao_solicitante: requisicao?.observacao_solicitante ?? '',
        itens: itensIniciais,
    });

    const addItem = (produto) => {
        if (!produto) return;
        // Evita duplicar mesmo produto
        if (data.itens.some((i) => i.produto_id === produto.id)) {
            alert('Esse produto já está na requisição. Ajuste a quantidade no item existente.');
            return;
        }
        setData('itens', [...data.itens, {
            produto_id: produto.id,
            produto,
            quantidade_solicitada: 1,
            valor_unitario_estimado: produto.valor_unitario || produto.valor_ultima_entrada || 0,
            observacao: '',
        }]);
    };

    const updateItem = (idx, campo, valor) => {
        const novos = data.itens.map((it, i) => i === idx ? { ...it, [campo]: valor } : it);
        setData('itens', novos);
    };

    const removeItem = (idx) => {
        setData('itens', data.itens.filter((_, i) => i !== idx));
    };

    const submit = (e) => {
        e.preventDefault();
        if (data.itens.length === 0) {
            alert('Adicione pelo menos um item antes de salvar.');
            return;
        }
        const url = isEdit
            ? route('admin.estoque.requisicoes.update', requisicao.id)
            : route('admin.estoque.requisicoes.store');
        isEdit ? put(url) : post(url);
    };

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const totalEstimado = data.itens.reduce(
        (s, it) => s + (Number(it.quantidade_solicitada || 0) * Number(it.valor_unitario_estimado || 0)),
        0
    );

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? `Editar ${requisicao.numero}` : 'Nova requisição'} />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {isEdit ? `Editar requisição ${requisicao.numero}` : 'Nova requisição'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isEdit ? 'Edição permitida apenas em rascunho.' : 'Crie um rascunho. Depois envie para aprovação.'}
                        </p>
                    </div>
                    <Link
                        href={isEdit ? route('admin.estoque.requisicoes.show', requisicao.id) : route('admin.estoque.requisicoes.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        ← Voltar
                    </Link>
                </header>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CABEÇALHO */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados gerais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Obra de origem *" error={errors.obra_origem_id} hint="De onde o material será retirado">
                                    <select
                                        value={data.obra_origem_id}
                                        onChange={(e) => setData('obra_origem_id', e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">— Selecione —</option>
                                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                                    </select>
                                </Field>
                                <Field label="Obra de destino" error={errors.obra_destino_id} hint="Opcional — onde será usado">
                                    <select
                                        value={data.obra_destino_id}
                                        onChange={(e) => setData('obra_destino_id', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">— Mesma obra —</option>
                                        {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                                    </select>
                                </Field>
                                <Field label="Data da solicitação *" error={errors.data_solicitacao}>
                                    <input
                                        type="date" required
                                        value={data.data_solicitacao}
                                        onChange={(e) => setData('data_solicitacao', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                            </div>
                            <Field label="Observação" error={errors.observacao_solicitante}>
                                <textarea
                                    rows={2}
                                    value={data.observacao_solicitante}
                                    onChange={(e) => setData('observacao_solicitante', e.target.value)}
                                    placeholder="Justificativa, contexto, etc."
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </Field>
                        </div>

                        {/* ITENS */}
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                Itens da requisição ({data.itens.length})
                            </h3>
                            <ProdutoPicker onSelect={addItem} />
                            {errors.itens && <p className="text-xs text-red-600 mt-2">{errors.itens}</p>}

                            {data.itens.length === 0 ? (
                                <div className="mt-4 text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                    <i className="fa-solid fa-boxes-stacked text-2xl mb-2 block" />
                                    Adicione o primeiro item buscando acima.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-2">
                                    {data.itens.map((item, idx) => (
                                        <ItemCard
                                            key={item.produto_id}
                                            item={item}
                                            onUpdate={(campo, valor) => updateItem(idx, campo, valor)}
                                            onRemove={() => removeItem(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RESUMO + AÇÕES */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border p-4 sticky top-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo</h3>
                            <Linha label="Itens" valor={data.itens.length} />
                            <Linha label="Quantidade total" valor={data.itens.reduce((s, i) => s + Number(i.quantidade_solicitada || 0), 0).toLocaleString('pt-BR')} />
                            <Linha label="Valor estimado" valor={moeda(totalEstimado)} bold />

                            <hr className="my-4" />

                            <div className="space-y-2">
                                <button
                                    type="submit"
                                    disabled={processing || data.itens.length === 0}
                                    className="w-full px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 text-sm font-semibold disabled:opacity-50"
                                >
                                    {processing ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Salvar rascunho')}
                                </button>
                                <Link
                                    href={isEdit ? route('admin.estoque.requisicoes.show', requisicao.id) : route('admin.estoque.requisicoes.index')}
                                    className="block text-center px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                    Cancelar
                                </Link>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-900 leading-relaxed">
                                <i className="fa-solid fa-circle-info mr-1" />
                                Após salvar, abra o detalhe e clique em <strong>Enviar para aprovação</strong>.
                                Você só pode editar enquanto a requisição estiver em rascunho.
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

// =============================================================================
// Picker de produto (autocomplete)
// =============================================================================
function ProdutoPicker({ onSelect }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (q.length < 2) { setResultados([]); return; }
        setLoading(true);
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-produtos'), { params: { q } })
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

    const escolher = (p) => {
        onSelect(p);
        setQ('');
        setAberto(false);
    };

    return (
        <div ref={wrapRef} className="relative">
            <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar produto para adicionar (nome, SKU ou código de barras)…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            {loading && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-3 text-gray-400" />}
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-y-auto">
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
        </div>
    );
}

// =============================================================================
// Card de item da requisição
// =============================================================================
function ItemCard({ item, onUpdate, onRemove }) {
    const p = item.produto;
    const subtotal = Number(item.quantidade_solicitada || 0) * Number(item.valor_unitario_estimado || 0);
    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
                {p?.imagem ? (
                    <img src={`/storage/${p.imagem}`} alt="" className="w-12 h-12 rounded object-cover border shrink-0" />
                ) : (
                    <div className="w-12 h-12 rounded bg-white border flex items-center justify-center text-gray-400 shrink-0">
                        <i className="fa-solid fa-box" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p?.nome || `Produto #${item.produto_id}`}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{p?.sku} · {p?.unidade}</p>
                </div>
                <button type="button" onClick={onRemove}
                    className="text-gray-400 hover:text-red-600 px-2 py-1"
                    title="Remover">
                    <i className="fa-solid fa-trash" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
                <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Quantidade</label>
                    <input
                        type="number" step="0.001" min="0.001"
                        value={item.quantidade_solicitada}
                        onChange={(e) => onUpdate('quantidade_solicitada', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Valor unit. (R$)</label>
                    <input
                        type="number" step="0.01" min="0"
                        value={item.valor_unitario_estimado}
                        onChange={(e) => onUpdate('valor_unitario_estimado', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Subtotal</label>
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">{moeda(subtotal)}</div>
                </div>
                <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Observação</label>
                    <input
                        type="text" maxLength={500}
                        value={item.observacao || ''}
                        onChange={(e) => onUpdate('observacao', e.target.value)}
                        placeholder="Opcional"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                </div>
            </div>
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

function Linha({ label, valor, bold = false }) {
    return (
        <div className="flex items-baseline justify-between py-1">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-sm text-gray-900 ${bold ? 'font-bold' : ''}`}>{valor}</span>
        </div>
    );
}
