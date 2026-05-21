import { Head, Link, router, usePage } from '@inertiajs/react';
import { safeLabel } from '@/utils/sanitize';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmtDT = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

export default function QuilometragemIndex({ registros, veiculos, filtros }) {
  const { flash } = usePage().props;
  const [veiculoId, setVeiculoId] = useState(filtros?.veiculo_id ?? '');

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.quilometragem.index'), { veiculo_id: veiculoId }, {
      preserveState: true, preserveScroll: true,
    });
  };
  const excluir = (q) => {
    if (!confirm('Remover este registro?')) return;
    router.delete(route('admin.frota.quilometragem.destroy', q.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Hodômetros" />
      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Hodômetros (km)</h1>
          <p className="text-sm text-gray-500">Registros gerados pelo app mobile</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={aplicar} className="mb-4 flex gap-2">
          <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 flex-1">
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.prefixo} {v.placa ? `(${v.placa})` : ''}</option>)}
          </select>
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3 text-right">Anterior</th>
                <th className="px-4 py-3 text-right">Nova</th>
                <th className="px-4 py-3 text-right">Δ km</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registros.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Sem registros.</td></tr>
              ) : registros.data.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{fmtDT(q.data_quilometragem)}</td>
                  <td className="px-4 py-3 font-medium">{q.veiculo?.prefixo} {q.veiculo?.placa && <span className="text-gray-400">({q.veiculo.placa})</span>}</td>
                  <td className="px-4 py-3 text-right">{q.quilometragem_atual ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{q.quilometragem_nova ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {(q.quilometragem_atual && q.quilometragem_nova) ? `+${q.quilometragem_nova - q.quilometragem_atual} km` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{q.user_create ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => excluir(q)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {registros.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {registros.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                    className={`px-3 py-1 rounded text-sm ${
                      link.active ? 'bg-rise-600 text-white' :
                      link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={safeLabel(link.label)} />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
