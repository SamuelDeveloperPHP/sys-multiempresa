import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ModelosIndex({ modelos, marcas, filtros }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);
  const [f, setF] = useState({ q: filtros?.q ?? '', marca_id: filtros?.marca_id ?? '' });

  const novo = useForm({ modelo: '', marca_id: '' });

  const salvarNovo = (e) => {
    e.preventDefault();
    novo.post(route('admin.frota.modelos.store'), {
      preserveScroll: true,
      onSuccess: () => novo.reset(),
    });
  };

  const aplicarFiltro = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.modelos.index'), f, { preserveState: true, preserveScroll: true });
  };

  const excluir = (m) => {
    if (!confirm(`Remover o modelo "${m.modelo}"?`)) return;
    router.delete(route('admin.frota.modelos.destroy', m.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Modelos" />
      <div className="p-6 w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Modelos (Veículo / Máquina)</h1>
          <p className="text-sm text-gray-500">Sugestões de modelo (opcional: vincular a uma marca)</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={salvarNovo} className="bg-white rounded-lg shadow border p-4 mb-4">
          <h2 className="font-semibold mb-2">Adicionar modelo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select value={novo.data.marca_id} onChange={(e) => novo.setData('marca_id', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2">
              <option value="">— marca (opcional) —</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.marca}</option>)}
            </select>
            <input value={novo.data.modelo} onChange={(e) => novo.setData('modelo', e.target.value)}
                   placeholder="Nome do modelo *" className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
            <button type="submit" disabled={novo.processing}
                    className="bg-rise-600 text-white rounded px-4 py-2 hover:bg-rise-700 disabled:opacity-50">
              {novo.processing ? '...' : 'Adicionar'}
            </button>
          </div>
          {novo.errors.modelo && <p className="text-red-600 text-sm mt-1">{novo.errors.modelo}</p>}
        </form>

        <form onSubmit={aplicarFiltro} className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={f.marca_id} onChange={(e) => setF({ ...f, marca_id: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as marcas</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.marca}</option>)}
          </select>
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar nome..."
                 className="border border-gray-300 rounded px-3 py-2" />
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modelos.data.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-gray-500 py-8">Nenhum modelo cadastrado.</td></tr>
              ) : modelos.data.map((m) => (
                <Row key={m.id} modelo={m} marcas={marcas} editing={editingId === m.id}
                     onEdit={() => setEditingId(m.id)} onCancel={() => setEditingId(null)} onDelete={() => excluir(m)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function Row({ modelo, marcas, editing, onEdit, onCancel, onDelete }) {
  const edit = useForm({ modelo: modelo.modelo, marca_id: modelo.marca_id ?? '' });

  const salvar = (e) => {
    e.preventDefault();
    edit.put(route('admin.frota.modelos.update', modelo.id), { preserveScroll: true, onSuccess: onCancel });
  };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">{modelo.marca?.marca ?? '—'}</td>
        <td className="px-4 py-3 font-medium">{modelo.modelo}</td>
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
        <select value={edit.data.marca_id} onChange={(e) => edit.setData('marca_id', e.target.value)}
                className="w-full border rounded px-2 py-1">
          <option value="">—</option>
          {marcas.map((m) => <option key={m.id} value={m.id}>{m.marca}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <input value={edit.data.modelo} onChange={(e) => edit.setData('modelo', e.target.value)}
               className="w-full border rounded px-2 py-1" />
      </td>
      <td className="px-4 py-3 text-right space-x-2">
        <button onClick={salvar} disabled={edit.processing} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rise-700 bg-rise-50 border border-rise-200 rounded-md hover:bg-rise-100 transition">Salvar</button>
        <button onClick={onCancel} className="text-gray-600 hover:underline">Cancelar</button>
      </td>
    </tr>
  );
}
