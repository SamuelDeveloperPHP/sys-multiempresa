import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ChecklistsIndex({ checklists, filtros }) {
  const { flash } = usePage().props;
  const [q, setQ] = useState(filtros?.q ?? '');

  const buscar = (e) => {
    e.preventDefault();
    router.get(route('admin.frota.checklists.index'), { q }, {
      preserveState: true, preserveScroll: true,
    });
  };

  const excluir = (c) => {
    if (!confirm(`Remover o checklist "${c.nome_checklist}"?`)) return;
    router.delete(route('admin.frota.checklists.destroy', c.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Modelos de checklist" />
      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Modelos de checklist</h1>
          <Link href={route('admin.frota.checklists.create')}
                className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700">
            + Novo modelo
          </Link>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={buscar} className="mb-4 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="Buscar por nome..."
                 className="flex-1 border border-gray-300 rounded px-3 py-2" />
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Buscar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3"># Itens</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checklists.data.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-500 py-8">Nenhum modelo cadastrado.</td></tr>
              ) : checklists.data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.nome_checklist}</td>
                  <td className="px-4 py-3">
                    {c.veiculo ? `${c.veiculo.prefixo}${c.veiculo.placa ? ' (' + c.veiculo.placa + ')' : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3">{c.itens_count}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      c.situacao === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>{c.situacao || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link href={route('admin.frota.checklists.itens.index', c.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">
                      Itens ({c.itens_count})
                    </Link>
                    <Link href={route('admin.frota.checklists.edit', c.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</Link>
                    <button onClick={() => excluir(c)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
