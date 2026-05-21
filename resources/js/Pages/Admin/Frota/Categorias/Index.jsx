import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CategoriasIndex({ categorias, filtros }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);

  const novo = useForm({ nome_categoria: '', status_categoria: 'Ativo' });
  const buscar = useForm({ q: filtros?.q ?? '' });

  const salvarNovo = (e) => {
    e.preventDefault();
    novo.post(route('admin.frota.categorias.store'), {
      preserveScroll: true,
      onSuccess: () => novo.reset(),
    });
  };

  const aplicarBusca = (e) => {
    e.preventDefault();
    router.get(route('admin.frota.categorias.index'), { q: buscar.data.q }, { preserveState: true, preserveScroll: true });
  };

  const excluir = (c) => {
    if (!confirm(`Remover a categoria "${c.nome_categoria}"?`)) return;
    router.delete(route('admin.frota.categorias.destroy', c.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Categorias de Veículo" />
      <div className="p-6 w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Categorias de Veículo</h1>
          <p className="text-sm text-gray-500">Classificação principal (ex: Carros, Caminhões, Máquinas)</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={salvarNovo} className="bg-white rounded-lg shadow border p-4 mb-4">
          <h2 className="font-semibold mb-2">Adicionar categoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={novo.data.nome_categoria} onChange={(e) => novo.setData('nome_categoria', e.target.value)}
                   placeholder="Nome da categoria *" className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
            <select value={novo.data.status_categoria} onChange={(e) => novo.setData('status_categoria', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2">
              <option>Ativo</option><option>Inativo</option>
            </select>
            <button type="submit" disabled={novo.processing}
                    className="bg-rise-600 text-white rounded px-4 py-2 hover:bg-rise-700 disabled:opacity-50">
              {novo.processing ? '...' : 'Adicionar'}
            </button>
          </div>
          {novo.errors.nome_categoria && <p className="text-red-600 text-sm mt-1">{novo.errors.nome_categoria}</p>}
        </form>

        <form onSubmit={aplicarBusca} className="mb-4 flex gap-2">
          <input value={buscar.data.q} onChange={(e) => buscar.setData('q', e.target.value)} placeholder="Buscar..."
                 className="flex-1 border border-gray-300 rounded px-3 py-2" />
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Buscar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Subcategorias</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categorias.data.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-gray-500 py-8">Nenhuma categoria cadastrada.</td></tr>
              ) : categorias.data.map((c) => (
                <Row key={c.id} categoria={c} editing={editingId === c.id}
                     onEdit={() => setEditingId(c.id)} onCancel={() => setEditingId(null)} onDelete={() => excluir(c)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function Row({ categoria, editing, onEdit, onCancel, onDelete }) {
  const edit = useForm({
    nome_categoria: categoria.nome_categoria,
    status_categoria: categoria.status_categoria ?? 'Ativo',
  });

  const salvar = (e) => {
    e.preventDefault();
    edit.put(route('admin.frota.categorias.update', categoria.id), {
      preserveScroll: true,
      onSuccess: onCancel,
    });
  };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium">{categoria.nome_categoria}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded text-xs ${
            categoria.status_categoria === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
          }`}>{categoria.status_categoria}</span>
        </td>
        <td className="px-4 py-3 text-right">{categoria.subcategorias_count}</td>
        <td className="px-4 py-3 text-right space-x-2">
          <button onClick={onEdit} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-yellow-50">
      <td className="px-4 py-3">
        <input value={edit.data.nome_categoria} onChange={(e) => edit.setData('nome_categoria', e.target.value)}
               className="w-full border rounded px-2 py-1" />
      </td>
      <td className="px-4 py-3">
        <select value={edit.data.status_categoria} onChange={(e) => edit.setData('status_categoria', e.target.value)}
                className="w-full border rounded px-2 py-1">
          <option>Ativo</option><option>Inativo</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right">{categoria.subcategorias_count}</td>
      <td className="px-4 py-3 text-right space-x-2">
        <button onClick={salvar} disabled={edit.processing} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rise-700 bg-rise-50 border border-rise-200 rounded-md hover:bg-rise-100 transition">Salvar</button>
        <button onClick={onCancel} className="text-gray-600 hover:underline">Cancelar</button>
      </td>
    </tr>
  );
}
