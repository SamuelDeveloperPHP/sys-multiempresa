import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function ChecklistsItens({ checklist, itens }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);

  const novo = useForm({
    nome_servico: '',
    tipo_itens: '',
    periodo_dias: '',
    alerta_venci: '',
    situacao: 'Ativo',
  });

  const salvarNovo = (e) => {
    e.preventDefault();
    novo.post(route('admin.frota.checklists.itens.store', checklist.id), {
      preserveScroll: true,
      onSuccess: () => novo.reset(),
    });
  };

  const excluir = (item) => {
    if (!confirm(`Remover o item "${item.nome_servico}"?`)) return;
    router.delete(route('admin.frota.checklists.itens.destroy', [checklist.id, item.id]),
      { preserveScroll: true });
  };

  return (
    <>
      <Head title={`Itens — ${checklist.nome_checklist}`} />
      <div className="p-6 max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Itens do checklist</h1>
          <p className="text-gray-600">{checklist.nome_checklist}</p>
          <Link href={route('admin.frota.checklists.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        {/* Form de novo item */}
        <form onSubmit={salvarNovo} className="bg-white rounded-lg shadow border p-4 mb-6">
          <h2 className="font-semibold mb-2">Adicionar item</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input placeholder="Nome do serviço *" value={novo.data.nome_servico}
                   onChange={(e) => novo.setData('nome_servico', e.target.value)}
                   className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
            <input placeholder="Tipo" value={novo.data.tipo_itens}
                   onChange={(e) => novo.setData('tipo_itens', e.target.value)}
                   className="border border-gray-300 rounded px-3 py-2" />
            <input placeholder="Período (dias)" type="number" value={novo.data.periodo_dias}
                   onChange={(e) => novo.setData('periodo_dias', e.target.value)}
                   className="border border-gray-300 rounded px-3 py-2" />
            <button type="submit" disabled={novo.processing}
                    className="bg-emerald-600 text-white rounded px-4 py-2 hover:bg-emerald-700 disabled:opacity-50">
              {novo.processing ? '...' : 'Adicionar'}
            </button>
          </div>
          {novo.errors.nome_servico && <p className="text-red-600 text-sm mt-1">{novo.errors.nome_servico}</p>}
        </form>

        {/* Lista de itens */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Nome do serviço</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Período (dias)</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-500 py-8">Nenhum item cadastrado ainda.</td></tr>
              ) : itens.map((item) => (
                <ItemRow key={item.id} checklist={checklist} item={item}
                         editingId={editingId} setEditingId={setEditingId}
                         onDelete={() => excluir(item)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ItemRow({ checklist, item, editingId, setEditingId, onDelete }) {
  const editando = editingId === item.id;
  const edit = useForm({
    nome_servico: item.nome_servico,
    tipo_itens: item.tipo_itens ?? '',
    periodo_dias: item.periodo_dias ?? '',
    alerta_venci: item.alerta_venci ?? '',
    situacao: item.situacao ?? 'Ativo',
  });

  const salvar = (e) => {
    e.preventDefault();
    edit.put(route('admin.frota.checklists.itens.update', [checklist.id, item.id]), {
      preserveScroll: true,
      onSuccess: () => setEditingId(null),
    });
  };

  if (!editando) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium">{item.nome_servico}</td>
        <td className="px-4 py-3">{item.tipo_itens || '—'}</td>
        <td className="px-4 py-3">{item.periodo_dias ?? '—'}</td>
        <td className="px-4 py-3">{item.situacao || '—'}</td>
        <td className="px-4 py-3 text-right space-x-2">
          <button onClick={() => setEditingId(item.id)} className="text-blue-600 hover:underline">Editar</button>
          <button onClick={onDelete} className="text-red-600 hover:underline">Excluir</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-yellow-50">
      <td className="px-4 py-3"><input value={edit.data.nome_servico}
        onChange={(e) => edit.setData('nome_servico', e.target.value)}
        className="w-full border rounded px-2 py-1" /></td>
      <td className="px-4 py-3"><input value={edit.data.tipo_itens}
        onChange={(e) => edit.setData('tipo_itens', e.target.value)}
        className="w-full border rounded px-2 py-1" /></td>
      <td className="px-4 py-3"><input type="number" value={edit.data.periodo_dias}
        onChange={(e) => edit.setData('periodo_dias', e.target.value)}
        className="w-full border rounded px-2 py-1" /></td>
      <td className="px-4 py-3">
        <select value={edit.data.situacao} onChange={(e) => edit.setData('situacao', e.target.value)}
                className="w-full border rounded px-2 py-1">
          <option>Ativo</option><option>Inativo</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right space-x-2">
        <button onClick={salvar} disabled={edit.processing} className="text-emerald-600 hover:underline">Salvar</button>
        <button onClick={() => setEditingId(null)} className="text-gray-600 hover:underline">Cancelar</button>
      </td>
    </tr>
  );
}
