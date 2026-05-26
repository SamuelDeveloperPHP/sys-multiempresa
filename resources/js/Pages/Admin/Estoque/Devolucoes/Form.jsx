// resources/js/Pages/Admin/Estoque/Devolucoes/Form.jsx
// -----------------------------------------------------------------------------
// Criar nova devolução. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState, useRef, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const ESTADOS = [
    { v: 'NOVO',      label: 'Novo (lacrado)',           cor: 'emerald' },
    { v: 'USADO_OK',  label: 'Usado em bom estado',      cor: 'blue' },
    { v: 'AVARIADO',  label: 'Avariado/danificado',      cor: 'red' },
];

export default function DevolucaoForm({ obras }) {
    const { data, setData, post, processing, errors } = useForm({
        funcionario_user_id: '',
        produto_id: '',
        obra_id: '',
        movimentacao_saida_id: '',
        quantidade: '',
        valor_unitario: '',
        estado_material: 'USADO_OK',
        motivo: '',
        observacao: '',
    });

    const [funcionarioSel, setFuncionarioSel] = useState(null);
    const [produtoSel, setProdutoSel] = useState(null);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.estoque.devolucoes.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Nova devolução" />
            <div className="p-6 w-full max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Nova devolução</h1>
                        <p className="text-sm text-gray-500">
                            Registre material sendo devolvido ao estoque. Após criação, aguarda aprovação do almoxarife.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.devolucoes.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                <form onSubmit={submit} className="space-y-4">
                    <div className="bg-white rounded-lg border p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Quem está devolvendo + produto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Funcionário *" error={errors.funcionario_user_id}>
                                <FuncionarioPicker selecionado={funcionarioSel} onChange={(u) => {
                                    setFuncionarioSel(u);
                                    setData('funcionario_user_id', u?.id || '');
                                }} />
                            </Field>
                            <Field label="Produto *" error={errors.produto_id}>
                                <ProdutoPicker selecionado={produtoSel} onChange={(p) => {
                                    setProdutoSel(p);
                                    setData('produto_id', p?.id || '');
                                    if (p && !data.valor_unitario) setData('valor_unitario', p.valor_unitario || 0);
                                }} />
                            </Field>
                        </div>
                        <Field label="Obra *" error={errors.obra_id}>
                            <select value={data.obra_id} onChange={(e) => setData('obra_id', e.target.value)} required
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                <option value="">— Selecione —</option>
                                {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="bg-white rounded-lg border p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Quantidade e estado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field label="Quantidade devolvida *" error={errors.quantidade}>
                                <input type="number" step="0.001" min="0.001" required
                                    value={data.quantidade}
                                    onChange={(e) => setData('quantidade', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </Field>
                            <Field label="Valor unitário (R$)" error={errors.valor_unitario}>
                                <input type="number" step="0.01" min="0"
                                    value={data.valor_unitario}
                                    onChange={(e) => setData('valor_unitario', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </Field>
                            <Field label="Estado *" error={errors.estado_material}>
                                <select value={data.estado_material}
                                    onChange={(e) => setData('estado_material', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    {ESTADOS.map((es) => <option key={es.v} value={es.v}>{es.label}</option>)}
                                </select>
                            </Field>
                        </div>
                        <Field label="Motivo" error={errors.motivo} hint="Ex.: sobra de obra, desistência, defeito">
                            <input type="text" maxLength={500}
                                value={data.motivo} onChange={(e) => setData('motivo', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </Field>
                        <Field label="Observação" error={errors.observacao}>
                            <textarea rows={2} value={data.observacao}
                                onChange={(e) => setData('observacao', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </Field>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
                        <i className="fa-solid fa-circle-info mr-1" />
                        Após salvar, a devolução fica em <strong>PENDENTE</strong>. O almoxarife com permissão
                        precisa <strong>aprovar com senha</strong> para que o saldo do estoque seja atualizado.
                    </div>

                    <div className="flex justify-end gap-2">
                        <Link href={route('admin.estoque.devolucoes.index')}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">Cancelar</Link>
                        <button type="submit" disabled={processing}
                            className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 text-sm font-semibold disabled:opacity-50">
                            {processing ? 'Salvando…' : 'Registrar devolução'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

// =============================================================================
// PICKERS (reusados)
// =============================================================================
function FuncionarioPicker({ selecionado, onChange }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!q || q.length < 2) { setResultados([]); return; }
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-funcionarios'), { params: { q } })
                .then((r) => { setResultados(r.data.data || []); setAberto(true); });
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    if (selecionado) {
        return (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-300">
                <div className="w-8 h-8 rounded-full bg-rise-100 text-rise-700 flex items-center justify-center font-bold text-xs">
                    {selecionado.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selecionado.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{selecionado.email}</p>
                </div>
                <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-600 px-1">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar funcionário…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
                    {resultados.map((u) => (
                        <li key={u.id} onClick={() => { onChange(u); setQ(''); setAberto(false); }}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer">
                            <div className="w-7 h-7 rounded-full bg-rise-100 text-rise-700 flex items-center justify-center font-bold text-xs">
                                {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{u.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ProdutoPicker({ selecionado, onChange }) {
    const [q, setQ] = useState('');
    const [resultados, setResultados] = useState([]);
    const [aberto, setAberto] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!q || q.length < 2) { setResultados([]); return; }
        const t = setTimeout(() => {
            axios.get(route('admin.estoque.movimentacoes.buscar-produtos'), { params: { q } })
                .then((r) => { setResultados(r.data.data || []); setAberto(true); });
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    if (selecionado) {
        return (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-300">
                {selecionado.imagem ? (
                    <img src={`/storage/${selecionado.imagem}`} alt="" className="w-10 h-10 rounded object-cover border" />
                ) : (
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center text-gray-400 border">
                        <i className="fa-solid fa-box" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selecionado.nome}</p>
                    <p className="text-[11px] text-gray-500 font-mono truncate">{selecionado.sku} · {selecionado.unidade}</p>
                </div>
                <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-600 px-1">
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar produto (nome/SKU)…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
                    {resultados.map((p) => (
                        <li key={p.id} onClick={() => { onChange(p); setQ(''); setAberto(false); }}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer">
                            {p.imagem ? (
                                <img src={`/storage/${p.imagem}`} alt="" className="w-8 h-8 rounded object-cover border" />
                            ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                    <i className="fa-solid fa-box" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{p.nome}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{p.sku} · {p.unidade}</p>
                            </div>
                        </li>
                    ))}
                </ul>
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
