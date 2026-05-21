import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function SubcategoriasIndex({ subcategorias, categorias, filtros }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);
  const [f, setF] = useState({ q: filtros?.q ?? '', id_categoria: filtros?.id_categoria ?? '' });

  const novo = useForm({ id_categoria: '', nome_subcategoria: '', status_subcategoria: 'Ativo' });

  const salvarNovo = (e) => {
    e.preventDefault();
    novo.post(route('admin.frota.subcategorias.store'), {
      preserveScroll: true,
      onSuccess: () => novo.reset(),
    });
  };

  const aplicarFiltro = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.subcategorias.index'), f, { preserveState: true, preserveScroll: true });
  };

  const excluir = (s) => {
    if (!confirm(`Remover a subcategoria "${s.nome_subcategoria}"?`)) return;
    router.delete(route('admin.frota.subcategorias.destroy', s.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Subcategorias de Veículo" />
      <div className="p-6 w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Subcategorias de Veículo</h1>
          <p className="text-sm text-gray-500">Detalhamento por categoria (ex: Carro/Sedã, Caminhão/3 eixos)</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={salvarNovo} className="bg-white rounded-lg shadow border p-4 mb-4">
          <h2 className="font-semibold mb-2">Adicionar subcategoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <select value={novo.data.id_categoria} onChange={(e) => novo.setData('id_categoria', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2">
              <option value="">— categoria —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
            </select>
            <input value={novo.data.nome_subcategoria} onChange={(e) => novo.setData('nome_subcategoria', e.target.value)}
                   placeholder="Nome *" className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
            <select value={novo.data.status_subcategoria} onChange={(e) => novo.setData('status_subcategoria', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2">
              <option>Ativo</option><option>Inativo</option>
            </select>
            <button type="submit" disabled={novo.processing}
                    className="bg-rise-600 text-white rounded px-4 py-2 hover:bg-rise-700 disabled:opacity-50">
              {novo.processing ? '...' : 'Adicionar'}
            </button>
          </div>
          {(novo.errors.id_categoria || novo.errors.nome_subcategoria) && (
            <p className="text-red-600 text-sm mt-1">{novo.errors.id_categoria || novo.errors.nome_subcategoria}</p>
          )}
        </form>

        <form onSubmit={aplicarFiltro} className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={f.id_categoria} onChange={(e) => setF({ ...f, id_categoria: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
          </select>
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar nome..."
                 className="border border-gray-300 rounded px-3 py-2" />
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Subcategoria</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subcategorias.data.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-gray-500 py-8">Nenhuma subcategoria cadastrada.</td></tr>
              ) : subcategorias.data.map((s) => (
                <Row key={s.id} sub={s} categorias={categorias} editing={editingId === s.id}
                     onEdit={() => setEditingId(s.id)} onCancel={() => setEditingId(null)} onDelete={() => excluir(s)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function Row({ sub, categorias, editing, onEdit, onCancel, onDelete }) {
  const edit = useForm({
    id_categoria: sub.id_categoria,
    nome_subcategoria: sub.nome_subcategoria,
    status_subcategoria: sub.status_subcategoria ?? 'Ativo',
  });

  const salvar = (e) => {
    e.preventDefault();
    edit.put(route('admin.frota.subcategorias.update', sub.id), { preserveScroll: true, onSuccess: onCancel });
  };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">{sub.categoria?.nome_categoria ?? '—'}</td>
        <td className="px-4 py-3 font-medium">{sub.nome_subcategoria}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded text-xs ${
            sub.status_subcategoria === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
          }`}>{sub.status_subcategoria}</span>
        </td>
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
        <select value={edit.data.id_categoria} onChange={(e) => edit.setData('id_categoria', e.target.value)}
                className="w-full border rounded px-2 py-1">
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <input value={edit.data.nome_subcategoria} onChange={(e) => edit.setData('nome_subcategoria', e.target.value)}
               className="w-full border rounded px-2 py-1" />
      </td>
      <td className="px-4 py-3">
        <select value={edit.data.status_subcategoria} onChange={(e) => edit.setData('status_subcategoria', e.target.value)}
                className="w-full border rounded px-2 py-1">
          <option>Ativo</option><option>Inativo</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right space-x-2">
        <button onClick={salvar} disabled={edit.processing} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rise-700 bg-rise-50 border border-rise-200 rounded-md hover:bg-rise-100 transition">Salvar</button>
        <button onClick={onCancel} className="text-gray-600 hover:underline">Cancelar</button>
      </td>
    </tr>
  );
}
