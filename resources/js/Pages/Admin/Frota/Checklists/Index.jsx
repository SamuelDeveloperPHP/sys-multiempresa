import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

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
    <>
      <Head title="Modelos de checklist" />
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Modelos de checklist</h1>
          <Link href={route('admin.frota.checklists.create')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
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
                    <Link href={route('admin.frota.checklists.itens.index', c.id)} className="text-purple-600 hover:underline">
                      Itens ({c.itens_count})
                    </Link>
                    <Link href={route('admin.frota.checklists.edit', c.id)} className="text-blue-600 hover:underline">Editar</Link>
                    <button onClick={() => excluir(c)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
