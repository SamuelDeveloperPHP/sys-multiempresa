import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const fmtDT = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const minToHm = (m) => {
  if (!m) return '0h';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2,'0')}` : `${h}h`;
};

export default function DiarioIndex({ diarios, veiculos, obras, filtros }) {
  const { flash } = usePage().props;
  const [f, setF] = useState({
    veiculo_id: filtros?.veiculo_id ?? '',
    id_obra: filtros?.id_obra ?? '',
    ciclo_status: filtros?.ciclo_status ?? '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.diario.index'), f, { preserveState: true, preserveScroll: true });
  };

  return (
    <>
      <Head title="Diário de bordo" />
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Diário de bordo</h1>
          <p className="text-sm text-gray-500">Registros enviados pelo app mobile</p>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={aplicar} className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
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
          <select value={f.ciclo_status} onChange={(e) => setF({ ...f, ciclo_status: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os ciclos</option>
            <option value="ABERTO">Aberto</option>
            <option value="ENCERRADO">Encerrado</option>
          </select>
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Fim</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Horas</th>
                <th className="px-4 py-3">Ciclo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {diarios.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-8">Nenhum diário encontrado.</td></tr>
              ) : diarios.data.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{fmtDT(d.horario_inicial)}</td>
                  <td className="px-4 py-3">{fmtDT(d.horario_final)}</td>
                  <td className="px-4 py-3 font-medium">{d.veiculo?.prefixo ?? '—'}</td>
                  <td className="px-4 py-3">{d.obra?.nome_fantasia ?? '—'}</td>
                  <td className="px-4 py-3">{d.user?.name ?? d.user_create ?? '—'}</td>
                  <td className="px-4 py-3">{minToHm(d.horas_trabalhadas_minutos)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      d.ciclo_status === 'ABERTO' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>{d.ciclo_status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={route('admin.frota.diario.show', d.id)} className="text-blue-600 hover:underline">Detalhes</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {diarios.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {diarios.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                    className={`px-3 py-1 rounded text-sm ${
                      link.active ? 'bg-emerald-600 text-white' :
                      link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
