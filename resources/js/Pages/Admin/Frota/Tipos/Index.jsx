import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function TiposIndex({ tipos, filtros }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);

  const novo = useForm({ nome: '', codigo: '' });
  const buscar = useForm({ q: filtros?.q ?? '' });

  const salvarNovo = (e) => {
    e.preventDefault();
    novo.post(route('admin.frota.tipos.store'), {
      preserveScroll: true,
      onSuccess: () => novo.reset(),
    });
  };

  const aplicarBusca = (e) => {
    e.preventDefault();
    router.get(route('admin.frota.tipos.index'), { q: buscar.data.q }, { preserveState: true, preserveScroll: true });
  };

  const excluir = (t) => {
    if (!confirm(`Remover o tipo "${t.nome}"?`)) return;
    router.delete(route('admin.frota.tipos.destroy', t.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Tipos de Veículo" />
      <div className="p-6 max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Tipos de Veículo</h1>
          <p className="text-sm text-gray-500">Catálogo livre (alternativa ao select fixo motos/carros/caminhões/máquinas)</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={salvarNovo} className="bg-white rounded-lg shadow border p-4 mb-4">
          <h2 className="font-semibold mb-2">Adicionar tipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={novo.data.nome} onChange={(e) => novo.setData('nome', e.target.value)}
                   placeholder="Nome *" className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
            <input value={novo.data.codigo} onChange={(e) => novo.setData('codigo', e.target.value)}
                   placeholder="Código (opcional)" className="border border-gray-300 rounded px-3 py-2" />
            <button type="submit" disabled={novo.processing}
                    className="bg-rise-600 text-white rounded px-4 py-2 hover:bg-rise-700 disabled:opacity-50">
              {novo.processing ? '...' : 'Adicionar'}
            </button>
          </div>
          {novo.errors.nome && <p className="text-red-600 text-sm mt-1">{novo.errors.nome}</p>}
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
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tipos.data.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-gray-500 py-8">Nenhum tipo cadastrado.</td></tr>
              ) : tipos.data.map((t) => (
                <Row key={t.id} tipo={t} editing={editingId === t.id}
                     onEdit={() => setEditingId(t.id)} onCancel={() => setEditingId(null)} onDelete={() => excluir(t)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function Row({ tipo, editing, onEdit, onCancel, onDelete }) {
  const edit = useForm({ nome: tipo.nome, codigo: tipo.codigo ?? '' });

  const salvar = (e) => {
    e.preventDefault();
    edit.put(route('admin.frota.tipos.update', tipo.id), { preserveScroll: true, onSuccess: onCancel });
  };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium">{tipo.nome}</td>
        <td className="px-4 py-3 font-mono text-gray-500">{tipo.codigo || '—'}</td>
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
        <input value={edit.data.nome} onChange={(e) => edit.setData('nome', e.target.value)}
               className="w-full border rounded px-2 py-1" />
      </td>
      <td className="px-4 py-3">
        <input value={edit.data.codigo} onChange={(e) => edit.setData('codigo', e.target.value)}
               className="w-full border rounded px-2 py-1" />
      </td>
      <td className="px-4 py-3 text-right space-x-2">
        <button onClick={salvar} disabled={edit.processing} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rise-700 bg-rise-50 border border-rise-200 rounded-md hover:bg-rise-100 transition">Salvar</button>
        <button onClick={onCancel} className="text-gray-600 hover:underline">Cancelar</button>
      </td>
    </tr>
  );
}
