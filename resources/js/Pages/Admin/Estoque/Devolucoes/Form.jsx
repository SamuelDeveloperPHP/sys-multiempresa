// resources/js/Pages/Admin/Estoque/Devolucoes/Form.jsx
// -----------------------------------------------------------------------------
// Criar nova devolução (fluxo PENDENTE → aprovação posterior do almoxarife).
// O devolvedor aqui é um USUÁRIO DO SISTEMA (funcionario_user_id).
// Para devolução por funcionário sem login, use a tela "Devolução rápida".
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Field, ProdutoPicker, UsuarioRetiradaPicker } from '../_shared/Pickers';

const ESTADOS = [
    { v: 'NOVO',      label: 'Novo (lacrado)',       cor: 'emerald' },
    { v: 'USADO_OK',  label: 'Usado em bom estado',  cor: 'blue' },
    { v: 'AVARIADO',  label: 'Avariado/danificado',  cor: 'red' },
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

    const [usuarioSel, setUsuarioSel] = useState(null);
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
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.estoque.devolucoes.rapida.create')}
                            className="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 text-sm font-semibold">
                            ⚡ Devolução rápida (funcionário)
                        </Link>
                        <Link href={route('admin.estoque.devolucoes.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                    </div>
                </header>

                <form onSubmit={submit} className="space-y-4">
                    <div className="bg-white rounded-lg border p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Quem está devolvendo + produto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Usuário que devolve *" error={errors.funcionario_user_id}>
                                <UsuarioRetiradaPicker selecionado={usuarioSel} onChange={(u) => {
                                    setUsuarioSel(u);
                                    setData('funcionario_user_id', u?.id || '');
                                }} />
                            </Field>
                            <Field label="Produto *" error={errors.produto_id}>
                                <ProdutoPicker value={data.produto_id} selecionado={produtoSel} onChange={(p) => {
                                    setProdutoSel(p);
                                    setData('produto_id', p?.id || '');
                                    if (p && !data.valor_unitario) setData('valor_unitario', p.valor_unitario || 0);
                                }} />
                            </Field>
                        </div>
                        <Field label="Obra *" error={errors.obra_id}>
                            <select value={data.obra_id} onChange={(e) => setData('obra_id', e.target.value)} required
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
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
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                            </Field>
                            <Field label="Valor unitário (R$)" error={errors.valor_unitario}>
                                <input type="number" step="0.01" min="0"
                                    value={data.valor_unitario}
                                    onChange={(e) => setData('valor_unitario', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                            </Field>
                            <Field label="Estado *" error={errors.estado_material}>
                                <select value={data.estado_material}
                                    onChange={(e) => setData('estado_material', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                >
                                    {ESTADOS.map((es) => <option key={es.v} value={es.v}>{es.label}</option>)}
                                </select>
                            </Field>
                        </div>
                        <Field label="Motivo" error={errors.motivo} hint="Ex.: sobra de obra, desistência, defeito">
                            <input type="text" maxLength={500}
                                value={data.motivo} onChange={(e) => setData('motivo', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </Field>
                        <Field label="Observação" error={errors.observacao}>
                            <textarea rows={2} value={data.observacao}
                                onChange={(e) => setData('observacao', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
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
