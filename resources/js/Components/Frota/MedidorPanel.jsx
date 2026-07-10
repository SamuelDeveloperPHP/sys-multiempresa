import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';

const fmtNum  = (v) => Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtData = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');

/**
 * Painel do gerente para medidores (horímetro / hodômetro). Resumo por veículo
 * (última leitura + atraso) + leituras inconsistentes para limpeza. Compartilhado
 * pelas telas de Horímetro e Hodômetro (muda só a unidade e as rotas).
 */
export default function MedidorPanel({
  titulo, unidade = 'km', veiculos = [], inconsistencias = [], kpis = {},
  obras = [], filtros = {}, agora = '', routeIndex, routeDestroy,
}) {
  const [busca, setBusca] = useState(filtros.q ?? '');
  const [obraId, setObraId] = useState(filtros.obra_id ? String(filtros.obra_id) : '');

  const aplicar = (extra = {}) => {
    router.get(route(routeIndex), { q: busca || undefined, obra_id: obraId || undefined, ...extra },
      { preserveState: true, preserveScroll: true });
  };
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setBusca(''); setObraId(''); router.get(route(routeIndex), {}, { preserveScroll: true }); };

  const optObras = useMemo(() => obras.map((o) => ({ value: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);

  const excluir = (r) => {
    if (!confirm(`Excluir esta leitura (${fmtNum(r.atual)} → ${fmtNum(r.novo)} ${unidade}) do ${r.prefixo}? Isso corrige a medição do veículo.`)) return;
    router.delete(route(routeDestroy, r.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title={titulo} />

      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{titulo}</h1>
          <span className="text-sm text-gray-400">Leituras enviadas pelo app mobile</span>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Kpi label="Veículos c/ leitura" value={fmtNum(kpis.veiculos)} />
          <Kpi label={`Atrasados (>15 dias)`} value={fmtNum(kpis.atrasados)} cor="text-amber-600" />
          <Kpi label="Veículos c/ inconsistência" value={fmtNum(kpis.com_inconsist)} cor="text-rose-600" />
          <Kpi label="Leituras inconsistentes" value={fmtNum(kpis.leituras_inconsist)} cor="text-rose-700" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Placa / Prefixo / Modelo / Marca (busca ao digitar)"
            className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500" />
          <SearchableSelect value={obraId} onChange={(v) => { setObraId(v); aplicar({ obra_id: v || undefined }); }} options={optObras} placeholder="Todas as obras" className="min-w-[220px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        {/* Leituras inconsistentes (limpeza) */}
        {inconsistencias.length > 0 && (
          <div className="bg-white rounded-lg border border-rose-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-rose-200 bg-rose-50 flex items-center gap-2">
              <h3 className="font-semibold text-rose-800">⚠ Leituras inconsistentes</h3>
              <span className="text-xs bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-semibold">{inconsistencias.length}</span>
              <span className="text-xs text-rose-700">— corrompem a medição atual (eficiência, ciclos de preventiva). Exclua as erradas.</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="px-3 py-2">Veículo</th><th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2 text-right">Anterior</th><th className="px-3 py-2 text-right">Nova</th>
                    <th className="px-3 py-2">Motivo</th><th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inconsistencias.map((r) => (
                    <tr key={r.id} className="hover:bg-rose-50/40">
                      <td className="px-3 py-2 font-semibold text-rise-700">{r.prefixo}</td>
                      <td className="px-3 py-2">{fmtData(r.data)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.atual)} {unidade}</td>
                      <td className="px-3 py-2 text-right font-medium text-rose-700">{fmtNum(r.novo)} {unidade}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.motivo}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => excluir(r)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumo por veículo */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-200 bg-purple-50">
            <h3 className="font-semibold text-purple-900">Situação por veículo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Prefixo</th><th className="px-3 py-2">Veículo</th>
                  <th className="px-3 py-2">Placa / Chassi</th>
                  <th className="px-3 py-2 text-right">Última leitura</th>
                  <th className="px-3 py-2">Data</th><th className="px-3 py-2">Atraso</th>
                  <th className="px-3 py-2 text-right">Leituras</th>
                  <th className="px-3 py-2 text-right">Inconsist.</th>
                  <th className="px-3 py-2">Operador</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {veiculos.length === 0 ? (
                  <tr><td colSpan={10} className="text-center text-gray-400 py-8">Nenhum veículo com leitura no filtro.</td></tr>
                ) : veiculos.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-rise-700">{v.prefixo}</td>
                    <td className="px-3 py-2">{v.veiculo}</td>
                    <td className="px-3 py-2 text-gray-500">{v.placa_chassi}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtNum(v.ultima)} {unidade}</td>
                    <td className="px-3 py-2">{fmtData(v.ultima_data)}</td>
                    <td className="px-3 py-2">
                      {v.dias_atraso == null ? '—'
                        : v.atrasado
                          ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">{v.dias_atraso} dias</span>
                          : <span className="text-gray-500 text-xs">{v.dias_atraso} dias</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmtNum(v.leituras)}</td>
                    <td className="px-3 py-2 text-right">
                      {v.inconsistencias > 0
                        ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">{v.inconsistencias}</span>
                        : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{v.operador}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={route('admin.frota.veiculos.show', v.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100">Detalhes</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function Kpi({ label, value, cor = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${cor}`}>{value}</p>
    </div>
  );
}
