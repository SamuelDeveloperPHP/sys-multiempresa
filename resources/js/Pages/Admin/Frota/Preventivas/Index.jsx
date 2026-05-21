import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function PreventivasIndex({ preventivas, veiculos, filtros }) {
  const { flash } = usePage().props;
  const [f, setF] = useState({
    veiculo_id: filtros?.veiculo_id ?? '',
    q: filtros?.q ?? '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.preventivas.index'), f, { preserveState: true, preserveScroll: true });
  };
  const excluir = (p) => {
    if (!confirm(`Remover "${p.nome_preventiva}"?`)) return;
    router.delete(route('admin.frota.preventivas.destroy', p.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Preventivas" />
      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Preventivas</h1>
          <Link href={route('admin.frota.preventivas.create')}
                className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700">+ Nova preventiva</Link>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={aplicar} className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={f.veiculo_id} onChange={(e) => setF({ ...f, veiculo_id: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}
          </select>
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar nome..."
                 className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Período</th>
                <th className="px-4 py-3 text-right">Histórico</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preventivas.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Nenhuma preventiva cadastrada.</td></tr>
              ) : preventivas.data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nome_preventiva}</td>
                  <td className="px-4 py-3">{p.veiculo?.prefixo ?? '—'}</td>
                  <td className="px-4 py-3">{p.tipo ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{p.periodo ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={route('admin.frota.preventivas.show', p.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">
                      {p.itens_realizados_count} execuções
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      p.situacao === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>{p.situacao ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link href={route('admin.frota.preventivas.edit', p.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</Link>
                    <button onClick={() => excluir(p)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
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
