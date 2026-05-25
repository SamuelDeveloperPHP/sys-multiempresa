// resources/js/Pages/Admin/Estoque/Categorias/Index.jsx
// -----------------------------------------------------------------------------
// Gerencia árvore de categorias de produtos. Único arquivo: lista + modal de
// criação/edição. Design padrão Rise (header com bg-rise-600, cards brancos
// com border, tabela com hover:bg-gray-50).
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CategoriasIndex({ arvore, todasFlat }) {
    const { flash } = usePage().props;
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const novaCategoria = (parentId = null) => {
        setEditing({ parent_id: parentId, nome: '', descricao: '', ordem: 0, ativo: true });
        setModalOpen(true);
    };

    const editarCategoria = (cat) => {
        setEditing({ ...cat });
        setModalOpen(true);
    };

    const fecharModal = () => {
        setModalOpen(false);
        setEditing(null);
    };

    const excluir = (cat) => {
        if (!confirm(`Excluir a categoria "${cat.nome}"? Isso falha se tiver produtos ou subcategorias.`)) return;
        router.delete(route('admin.estoque.categorias.destroy', cat.id), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Categorias de Produtos" />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Categorias</h1>
                        <p className="text-sm text-gray-500">
                            Árvore de categorias para organizar o catálogo de produtos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => novaCategoria(null)}
                        className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700"
                    >
                        + Nova categoria raiz
                    </button>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
                        {flash.error}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow border">
                    {arvore.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <i className="fa-solid fa-folder-tree text-4xl text-gray-300 mb-3 block" />
                            Nenhuma categoria cadastrada. Comece criando uma categoria raiz.
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {arvore.map((cat) => (
                                <CategoriaNode
                                    key={cat.id}
                                    cat={cat}
                                    depth={0}
                                    onEdit={editarCategoria}
                                    onAddChild={novaCategoria}
                                    onDelete={excluir}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {modalOpen && (
                <CategoriaModal
                    editing={editing}
                    todasFlat={todasFlat}
                    onClose={fecharModal}
                />
            )}
        </AuthenticatedLayout>
    );
}

// =============================================================================
// Linha recursiva da árvore
// =============================================================================
function CategoriaNode({ cat, depth, onEdit, onAddChild, onDelete }) {
    const [expanded, setExpanded] = useState(true);
    const temFilhos = (cat.filhos || []).length > 0;

    return (
        <li>
            <div
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
                style={{ paddingLeft: `${depth * 24 + 16}px` }}
            >
                {/* Expand toggle */}
                {temFilhos ? (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700"
                    >
                        <i className={`fa-solid fa-caret-${expanded ? 'down' : 'right'}`} />
                    </button>
                ) : (
                    <span className="w-5" />
                )}

                {/* Ícone */}
                <i className={`fa-solid ${temFilhos ? 'fa-folder' : 'fa-folder-open'} text-rise-600`} />

                {/* Nome + descrição */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{cat.nome}</span>
                        {!cat.ativo && (
                            <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                Inativa
                            </span>
                        )}
                    </div>
                    {cat.descricao && (
                        <p className="text-xs text-gray-500 truncate">{cat.descricao}</p>
                    )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onAddChild(cat.id)}
                        title="Adicionar subcategoria"
                        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                    >
                        <i className="fa-solid fa-plus" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(cat)}
                        title="Editar"
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded"
                    >
                        <i className="fa-solid fa-pen-to-square" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(cat)}
                        title="Excluir"
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
                    >
                        <i className="fa-solid fa-trash" />
                    </button>
                </div>
            </div>

            {temFilhos && expanded && (
                <ul className="divide-y border-l-2 border-gray-100 ml-6">
                    {cat.filhos.map((sub) => (
                        <CategoriaNode
                            key={sub.id}
                            cat={sub}
                            depth={depth + 1}
                            onEdit={onEdit}
                            onAddChild={onAddChild}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

// =============================================================================
// Modal de criação/edição
// =============================================================================
function CategoriaModal({ editing, todasFlat, onClose }) {
    const isEdit = !!editing?.id;
    const { data, setData, post, put, processing, errors } = useForm({
        parent_id: editing?.parent_id ?? '',
        nome: editing?.nome ?? '',
        descricao: editing?.descricao ?? '',
        ordem: editing?.ordem ?? 0,
        ativo: editing?.ativo ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.estoque.categorias.update', editing.id), {
                onSuccess: onClose,
                preserveScroll: true,
            });
        } else {
            post(route('admin.estoque.categorias.store'), {
                onSuccess: onClose,
                preserveScroll: true,
            });
        }
    };

    // Opções de pai: todas exceto a própria categoria (no caso de edição)
    const opcoesPai = todasFlat.filter((c) => !isEdit || c.id !== editing.id);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        {isEdit ? 'Editar categoria' : 'Nova categoria'}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
                <form onSubmit={submit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria pai (opcional)</label>
                        <select
                            value={data.parent_id || ''}
                            onChange={(e) => setData('parent_id', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                            <option value="">— Raiz —</option>
                            {opcoesPai.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                        {errors.parent_id && <p className="text-xs text-red-600 mt-1">{errors.parent_id}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input
                            type="text"
                            value={data.nome}
                            onChange={(e) => setData('nome', e.target.value)}
                            required
                            autoFocus
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        {errors.nome && <p className="text-xs text-red-600 mt-1">{errors.nome}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                            value={data.descricao || ''}
                            onChange={(e) => setData('descricao', e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                            <input
                                type="number"
                                value={data.ordem}
                                onChange={(e) => setData('ordem', Number(e.target.value))}
                                min={0}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.ativo}
                                    onChange={(e) => setData('ativo', e.target.checked)}
                                    className="h-4 w-4 text-rise-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Ativa</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 text-sm disabled:opacity-50"
                        >
                            {processing ? 'Salvando…' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
