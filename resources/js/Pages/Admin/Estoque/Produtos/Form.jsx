// resources/js/Pages/Admin/Estoque/Produtos/Form.jsx
// -----------------------------------------------------------------------------
// Create + Edit unificado. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const UNIDADES = ['UN', 'PC', 'PAR', 'CX', 'PCT', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'SC'];

export default function ProdutoForm({ produto, categorias, fornecedores }) {
    const isEdit = !!produto?.id;
    // Produto vindo do catálogo Leroy: preço é só referência (campo travado).
    const isLeroy = produto?.origem === 'leroy_merlin';

    const { data, setData, post, processing, errors } = useForm({
        categoria_id: produto?.categoria_id ?? '',
        fornecedor_padrao_id: produto?.fornecedor_padrao_id ?? '',
        sku: produto?.sku ?? '',
        codigo_barras: produto?.codigo_barras ?? '',
        nome: produto?.nome ?? '',
        marca: produto?.marca ?? '',
        descricao: produto?.descricao ?? '',
        unidade: produto?.unidade ?? 'UN',
        peso_kg: produto?.peso_kg ?? '',
        valor_unitario: produto?.valor_unitario ?? '',
        estoque_minimo: produto?.estoque_minimo ?? '',
        estoque_maximo: produto?.estoque_maximo ?? '',
        imagem: null,
        ativo: produto?.ativo ?? true,
        _method: isEdit ? 'put' : 'post',
    });

    const [previewImg, setPreviewImg] = useState(
        produto?.imagem ? `/storage/${produto.imagem}` : null
    );

    const onImagemChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('imagem', file);
            setPreviewImg(URL.createObjectURL(file));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        const url = isEdit
            ? route('admin.estoque.produtos.update', produto.id)
            : route('admin.estoque.produtos.store');
        // useForm + arquivo: usa post(_method: put) para multipart funcionar
        post(url, { forceFormData: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? `Editar: ${produto.nome}` : 'Novo produto'} />
            <div className="p-6 w-full max-w-5xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {isEdit ? 'Editar produto' : 'Novo produto'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isEdit ? `SKU: ${produto.sku}` : 'Cadastro de produto no catálogo.'}
                        </p>
                    </div>
                    <Link
                        href={route('admin.estoque.produtos.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        ← Voltar
                    </Link>
                </header>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLUNA ESQUERDA — Imagem + status */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagem do produto</h3>
                            <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-3">
                                {previewImg ? (
                                    <img src={previewImg} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <i className="fa-solid fa-camera text-3xl mb-2 block" />
                                        <p className="text-xs">Sem imagem</p>
                                    </div>
                                )}
                            </div>
                            <label className="block">
                                <span className="sr-only">Escolher imagem</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={onImagemChange}
                                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-rise-600 file:text-white hover:file:bg-rise-700"
                                />
                            </label>
                            <p className="text-[11px] text-gray-400 mt-1">JPG, PNG ou WEBP até 5MB.</p>
                            {errors.imagem && <p className="text-xs text-red-600 mt-1">{errors.imagem}</p>}
                        </div>

                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.ativo}
                                    onChange={(e) => setData('ativo', e.target.checked)}
                                    className="h-4 w-4 text-rise-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Produto ativo</span>
                            </label>
                            <p className="text-[11px] text-gray-400 mt-1">
                                Inativos não aparecem para movimentação/requisição mas mantêm histórico.
                            </p>
                        </div>
                    </div>

                    {/* COLUNA DIREITA — Dados */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-lg border p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700">Identificação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="SKU" hint="Deixe em branco para gerar automaticamente" error={errors.sku}>
                                    <input
                                        type="text"
                                        value={data.sku}
                                        onChange={(e) => setData('sku', e.target.value)}
                                        placeholder="SGA-XXXXXXXX"
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                                    />
                                </Field>
                                <Field label="Código de barras / EAN" error={errors.codigo_barras}>
                                    <input
                                        type="text"
                                        value={data.codigo_barras}
                                        onChange={(e) => setData('codigo_barras', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                                    />
                                </Field>
                            </div>

                            <Field label="Nome *" error={errors.nome}>
                                <input
                                    type="text"
                                    value={data.nome}
                                    onChange={(e) => setData('nome', e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </Field>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Marca" error={errors.marca}>
                                    <input
                                        type="text"
                                        value={data.marca}
                                        onChange={(e) => setData('marca', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                                <Field label="Categoria" error={errors.categoria_id}>
                                    <select
                                        value={data.categoria_id}
                                        onChange={(e) => setData('categoria_id', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">— Sem categoria —</option>
                                        {categorias.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <Field label="Descrição" error={errors.descricao}>
                                <textarea
                                    value={data.descricao}
                                    onChange={(e) => setData('descricao', e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </Field>
                        </div>

                        <div className="bg-white rounded-lg border p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700">Medidas e valores</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Unidade *" error={errors.unidade}>
                                    <select
                                        value={data.unidade}
                                        onChange={(e) => setData('unidade', e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </Field>
                                <Field label="Peso (kg)" error={errors.peso_kg}>
                                    <input
                                        type="number" step="0.001" min="0"
                                        value={data.peso_kg}
                                        onChange={(e) => setData('peso_kg', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                                <Field
                                    label={isLeroy ? 'Valor de referência (R$)' : 'Valor unitário (R$)'}
                                    hint={isLeroy ? 'Preço de referência da Leroy — somente consulta' : undefined}
                                    error={errors.valor_unitario}
                                >
                                    <div className="relative">
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={data.valor_unitario}
                                            onChange={(e) => !isLeroy && setData('valor_unitario', e.target.value)}
                                            readOnly={isLeroy}
                                            disabled={isLeroy}
                                            title={isLeroy ? 'Valor de referência — não editável' : undefined}
                                            className={`w-full border rounded px-3 py-2 text-sm ${
                                                isLeroy
                                                    ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed pr-9'
                                                    : 'border-gray-300'
                                            }`}
                                        />
                                        {isLeroy && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400" title="Somente consulta">
                                                <i className="fa-solid fa-lock text-xs" />
                                            </span>
                                        )}
                                    </div>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Estoque mínimo" hint="Alerta quando saldo cair abaixo disso" error={errors.estoque_minimo}>
                                    <input
                                        type="number" step="0.001" min="0"
                                        value={data.estoque_minimo}
                                        onChange={(e) => setData('estoque_minimo', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                                <Field label="Estoque máximo" error={errors.estoque_maximo}>
                                    <input
                                        type="number" step="0.001" min="0"
                                        value={data.estoque_maximo}
                                        onChange={(e) => setData('estoque_maximo', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fornecedor padrão</h3>
                            <Field label="" error={errors.fornecedor_padrao_id}>
                                <select
                                    value={data.fornecedor_padrao_id}
                                    onChange={(e) => setData('fornecedor_padrao_id', e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">— Selecionar —</option>
                                    {fornecedores.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.razao_social} {f.nome_fantasia && f.nome_fantasia !== f.razao_social ? `(${f.nome_fantasia})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <p className="text-[11px] text-gray-400 mt-1">
                                Usado como sugestão padrão ao registrar entrada de estoque.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Link
                                href={route('admin.estoque.produtos.index')}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 text-sm disabled:opacity-50"
                            >
                                {processing ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Criar produto')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

// Helper Field
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
