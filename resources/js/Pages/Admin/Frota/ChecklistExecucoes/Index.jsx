import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmtDT = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

const cicloCor = {
  ABERTO:     'bg-amber-100 text-amber-800',
  CONCLUIDO:  'bg-green-100 text-green-800',
};
const syncLabel = (s) => ({ 0:'Pendente', 1:'Sincronizado', 2:'Enviando', 3:'Erro', 99:'Abandonado' }[s] ?? s);
const syncCor   = (s) => ({
  0: 'bg-blue-100 text-blue-700',
  1: 'bg-rise-100 text-rise-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-red-100 text-red-700',
  99:'bg-red-200 text-red-900 font-bold',
}[s] ?? 'bg-gray-100 text-gray-700');

export default function ExecucoesIndex({ execucoes, veiculos, obras, filtros }) {
  const { flash } = usePage().props;
  const [f, setF] = useState({
    veiculo_id: filtros?.veiculo_id ?? '',
    id_obra: filtros?.id_obra ?? '',
    status_ciclo: filtros?.status_ciclo ?? '',
    tipo_checklist: filtros?.tipo_checklist ?? '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.checklist-execucoes.index'), f, { preserveState: true, preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Execuções de checklist" />
      <div className="p-6 w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Execuções de checklist (mobile)</h1>
          <p className="text-sm text-gray-500">Aberturas e fechamentos registrados no app</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={aplicar} className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <select value={f.veiculo_id} onChange={(e) => setF({ ...f, veiculo_id: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}
          </select>
          <select value={f.id_obra} onChange={(e) => setF({ ...f, id_obra: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as obras</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
          </select>
          <select value={f.tipo_checklist} onChange={(e) => setF({ ...f, tipo_checklist: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os tipos</option>
            <option value="ABERTURA">Abertura</option>
            <option value="FECHAMENTO">Fechamento</option>
          </select>
          <select value={f.status_ciclo} onChange={(e) => setF({ ...f, status_ciclo: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os ciclos</option>
            <option value="ABERTO">Aberto</option>
            <option value="CONCLUIDO">Concluído</option>
          </select>
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Ciclo</th>
                <th className="px-4 py-3">Sync</th>
                <th className="px-4 py-3 text-right"># Itens</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {execucoes.data.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-8">Nenhuma execução encontrada.</td></tr>
              ) : execucoes.data.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{fmtDT(e.data_cadastro)}</td>
                  <td className="px-4 py-3 font-medium">{e.veiculo?.prefixo ?? '—'}</td>
                  <td className="px-4 py-3">{e.obra?.nome_fantasia ?? '—'}</td>
                  <td className="px-4 py-3">{e.checklist?.nome_checklist ?? '—'}</td>
                  <td className="px-4 py-3">{e.tipo_checklist}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${cicloCor[e.status_ciclo] ?? 'bg-gray-100 text-gray-700'}`}>
                      {e.status_ciclo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${syncCor(e.sync_status)}`}>{syncLabel(e.sync_status)}</span>
                    {e.anomalia_offline ? <span className="ml-1 bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded">Anomalia</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right">{e.itens_realizados_count}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={route('admin.frota.checklist-execucoes.show', e.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Detalhes</Link>
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
