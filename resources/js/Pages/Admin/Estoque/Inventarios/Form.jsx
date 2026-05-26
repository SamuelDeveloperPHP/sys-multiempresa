// resources/js/Pages/Admin/Estoque/Inventarios/Form.jsx
// -----------------------------------------------------------------------------
// Cria novo inventário (snapshot do saldo atual). Padrão Rise.
// -----------------------------------------------------------------------------

import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function InventarioForm({ obras }) {
    const { data, setData, post, processing, errors } = useForm({
        obra_id:           '',
        data_inicio:       new Date().toISOString().slice(0, 10),
        observacao:        '',
        apenas_com_saldo:  true,
    });

    const submit = (e) => {
        e.preventDefault();
        if (!confirm('Abrir inventário e gerar snapshot do saldo atual?\nEnquanto estiver aberto, novas movimentações na obra podem causar divergências.')) return;
        post(route('admin.estoque.inventarios.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Abrir inventário" />
            <div className="p-6 w-full max-w-3xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Abrir inventário</h1>
                        <p className="text-sm text-gray-500">
                            Snapshot do saldo atual será criado para contagem física posterior.
                        </p>
                    </div>
                    <Link href={route('admin.estoque.inventarios.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                <form onSubmit={submit} className="bg-white rounded-lg border p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Obra *" error={errors.obra_id} hint="Não é permitido haver 2 inventários abertos na mesma obra">
                            <select
                                value={data.obra_id}
                                onChange={(e) => setData('obra_id', e.target.value)}
                                required
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                <option value="">— Selecione —</option>
                                {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo_obra} — {o.nome_fantasia}</option>)}
                            </select>
                        </Field>

                        <Field label="Data de início *" error={errors.data_inicio}>
                            <input
                                type="date" required
                                max={new Date().toISOString().slice(0, 10)}
                                value={data.data_inicio}
                                onChange={(e) => setData('data_inicio', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </Field>
                    </div>

                    <Field label="Observação" error={errors.observacao}>
                        <textarea
                            rows={3}
                            value={data.observacao}
                            onChange={(e) => setData('observacao', e.target.value)}
                            placeholder="Justificativa, escopo, instruções…"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </Field>

                    <div className="pt-2 border-t">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.apenas_com_saldo}
                                onChange={(e) => setData('apenas_com_saldo', e.target.checked)}
                                className="mt-1 h-4 w-4 text-rise-600 rounded"
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Incluir apenas produtos COM saldo na obra
                                </p>
                                <p className="text-xs text-gray-500">
                                    Recomendado para inventários rápidos. Desmarque se quiser fazer contagem
                                    completa do catálogo (mais lento, mas pega itens com saldo zero que
                                    podem estar fisicamente presentes).
                                </p>
                            </div>
                        </label>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
                        <i className="fa-solid fa-circle-info mr-1" />
                        <strong>Como funciona:</strong> ao criar, o sistema gera 1 linha por produto
                        com o saldo atual (snapshot). Você preenche o saldo físico contado.
                        Ao fechar, as diferenças geram movimentações automáticas (ENTRADA quando
                        sobra, SAÍDA quando falta) que ajustam o saldo final.
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Link href={route('admin.estoque.inventarios.index')}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">Cancelar</Link>
                        <button type="submit" disabled={processing}
                            className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 text-sm font-semibold disabled:opacity-50">
                            {processing ? 'Gerando snapshot…' : 'Abrir inventário'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
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
