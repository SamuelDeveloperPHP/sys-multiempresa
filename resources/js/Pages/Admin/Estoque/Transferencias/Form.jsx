import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Field, ProdutoPicker, SaldoBadge } from '../_shared/Pickers';

/**
 * Formulário dedicado de TRANSFERÊNCIA entre obras.
 * Cria o par OUT/IN em transação no backend.
 */
export default function TransferenciaForm({ obras }) {
    const { data, setData, post, processing, errors } = useForm({
        produto_id:       '',
        obra_id:          '',
        obra_destino_id:  '',
        quantidade:       '',
        valor_unitario:   '',
        data_movimento:   new Date().toISOString().slice(0, 10),
        observacao:       '',
    });

    const [produtoSel, setProdutoSel] = useState(null);

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.estoque.transferencias.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Nova transferência entre obras" />
            <div className="p-6 w-full max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-orange-600">⇄</span> Nova transferência
                        </h1>
                        <p className="text-sm text-gray-500">Move estoque entre obras (gera par OUT+IN)</p>
                    </div>
                    <Link href={route('admin.estoque.transferencias.index')}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        ← Voltar
                    </Link>
                </header>

                <form onSubmit={submit} className="space-y-4">
                    <div className="bg-white border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Produto</h3>
                        <ProdutoPicker
                            value={data.produto_id}
                            onChange={(p) => { setProdutoSel(p); setData('produto_id', p?.id || ''); }}
                            selecionado={produtoSel}
                        />
                        {errors.produto_id && <p className="text-xs text-red-600 mt-2">{errors.produto_id}</p>}
                    </div>

                    <div className="bg-white border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Obra de origem *" error={errors.obra_id}>
                                <select value={data.obra_id} onChange={(e) => setData('obra_id', e.target.value)}
                                        required className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                    <option value="">— Selecione —</option>
                                    {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                                </select>
                            </Field>
                            <Field label="Obra de destino *" error={errors.obra_destino_id}>
                                <select value={data.obra_destino_id}
                                        onChange={(e) => setData('obra_destino_id', e.target.value)}
                                        required className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                    <option value="">— Selecione —</option>
                                    {obras.filter((o) => String(o.id) !== String(data.obra_id))
                                          .map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                                </select>
                            </Field>
                        </div>
                        {data.produto_id && data.obra_id && (
                            <SaldoBadge produto_id={data.produto_id} obra_id={data.obra_id}
                                        label="Saldo na obra de origem:" />
                        )}
                    </div>

                    <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Quantidade *" error={errors.quantidade}>
                            <input type="number" step="0.001" min="0.001" required
                                   value={data.quantidade}
                                   onChange={(e) => setData('quantidade', e.target.value)}
                                   className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </Field>
                        <Field label="Valor unitário (R$)" error={errors.valor_unitario}>
                            <input type="number" step="0.01" min="0"
                                   value={data.valor_unitario}
                                   onChange={(e) => setData('valor_unitario', e.target.value)}
                                   className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </Field>
                        <Field label="Data *" error={errors.data_movimento}>
                            <input type="date" required max={new Date().toISOString().slice(0, 10)}
                                   value={data.data_movimento}
                                   onChange={(e) => setData('data_movimento', e.target.value)}
                                   className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </Field>
                        {data.quantidade && data.valor_unitario && (
                            <div className="md:col-span-3 text-sm text-gray-600">
                                Valor total: <strong>{moeda(Number(data.quantidade) * Number(data.valor_unitario))}</strong>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                        <Field label="Observação" error={errors.observacao}>
                            <textarea value={data.observacao} onChange={(e) => setData('observacao', e.target.value)}
                                      rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </Field>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Link href={route('admin.estoque.transferencias.index')}
                              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={processing}
                                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-semibold disabled:opacity-50">
                            {processing ? 'Registrando…' : 'Registrar transferência'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
