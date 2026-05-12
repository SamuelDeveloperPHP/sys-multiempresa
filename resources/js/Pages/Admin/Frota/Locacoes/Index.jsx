import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function LocacoesIndex({ locacoes, obras, filtros }) {
  const { flash } = usePage().props;
  const [f, setF] = useState({
    obra_id: filtros?.obra_id ?? '',
    status: filtros?.status ?? '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.locacoes.index'), f, {
      preserveState: true, preserveScroll: true,
    });
  };

  const excluir = (l) => {
    if (!confirm(`Remover esta locação?`)) return;
    router.delete(route('admin.frota.locacoes.destroy', l.id), { preserveScroll: true });
  };

  const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <>
      <Head title="Locações" />
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Locações de Veículos</h1>
          <Link href={route('admin.frota.locacoes.create')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            + Nova locação
          </Link>
        </header>

        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
        )}

        <form onSubmit={aplicar} className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={f.obra_id} onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as obras</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
          </select>
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas</option>
            <option value="ativas">Apenas ativas (sem data_fim)</option>
            <option value="fechadas">Fechadas</option>
          </select>
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Funcionário destino</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Previsão</th>
                <th className="px-4 py-3">Fim</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {locacoes.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Nenhuma locação encontrada.</td></tr>
              ) : locacoes.data.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {l.veiculo?.prefixo}
                    {l.veiculo?.placa && <span className="text-gray-400 ml-1">({l.veiculo.placa})</span>}
                  </td>
                  <td className="px-4 py-3">{l.obra?.nome_fantasia ?? '—'}</td>
                  <td className="px-4 py-3">{l.funcionario_destino?.nome ?? '—'}</td>
                  <td className="px-4 py-3">{fmtData(l.data_inicio)}</td>
                  <td className="px-4 py-3">{fmtData(l.data_prevista)}</td>
                  <td className="px-4 py-3">
                    {l.data_fim
                      ? <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{fmtData(l.data_fim)}</span>
                      : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Ativa</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link href={route('admin.frota.locacoes.edit', l.id)} className="text-blue-600 hover:underline">Editar</Link>
                    <button onClick={() => excluir(l)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {locacoes.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {locacoes.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                    className={`px-3 py-1 rounded text-sm ${
                      link.active ? 'bg-emerald-600 text-white'
                                  : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
