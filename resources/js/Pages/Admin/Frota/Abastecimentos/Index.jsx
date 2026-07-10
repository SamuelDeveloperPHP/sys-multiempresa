import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';

const fmtMoney = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum   = (v, d = 0) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Admin/Frota/Abastecimentos/Index — painel do gerente (layout do diário):
 * gastos e CO₂ da frota por veículo, com curva ABC (os que mais gastam /
 * mais emitem). O lançamento individual é feito na aba do veículo / mobile.
 */
export default function AbastecimentosIndex({ veiculos = [], totais = {}, obras = [], filtros = {}, agora = '' }) {
  const [busca, setBusca] = useState(filtros.q ?? '');
  const [obraId, setObraId] = useState(filtros.obra_id ? String(filtros.obra_id) : '');
  const [criterio, setCriterio] = useState('co2'); // 'co2' | 'gasto'

  const aplicar = (extra = {}) => {
    router.get(route('admin.frota.abastecimentos.index'),
      { q: busca || undefined, obra_id: obraId || undefined, ...extra },
      { preserveState: true, preserveScroll: true });
  };
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setBusca(''); setObraId(''); router.get(route('admin.frota.abastecimentos.index'), {}, { preserveScroll: true }); };

  const optObras = useMemo(() => obras.map((o) => ({ value: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);

  // Curva ABC (Pareto): ordena pelo critério, % do total e % acumulado; classe
  // A (até 80% acumulado), B (até 95%), C (o restante).
  const metric = (v) => (criterio === 'co2' ? v.co2_fossil : v.gasto);
  const abc = useMemo(() => {
    const ord = [...veiculos].sort((a, b) => metric(b) - metric(a));
    const total = ord.reduce((s, v) => s + metric(v), 0);
    const max = ord.length ? metric(ord[0]) : 0;
    let acum = 0;
    return ord.map((v, i) => {
      const val = metric(v);
      const pct = total > 0 ? (val / total) * 100 : 0;
      acum += pct;
      const classe = acum <= 80 ? 'A' : acum <= 95 ? 'B' : 'C';
      return { ...v, rank: i + 1, val, pct, acum, classe, barra: max > 0 ? (val / max) * 100 : 0 };
    });
  }, [veiculos, criterio]); // eslint-disable-line react-hooks/exhaustive-deps

  const classeCor = { A: 'bg-rose-100 text-rose-700', B: 'bg-amber-100 text-amber-700', C: 'bg-gray-100 text-gray-600' };
  const contagem = { A: abc.filter((v) => v.classe === 'A').length, B: abc.filter((v) => v.classe === 'B').length, C: abc.filter((v) => v.classe === 'C').length };

  return (
    <AuthenticatedLayout>
      <Head title="Abastecimentos — Frota" />

      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Abastecimentos — Frota</h1>
          <Link href={route('admin.frota.abastecimentos.create')} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo abastecimento</Link>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {/* KPIs da frota */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Kpi label="Veículos c/ abastecimento" value={fmtNum(totais.veiculos)} />
          <Kpi label="Total de litros" value={`${fmtNum(totais.litros, 2)} L`} />
          <Kpi label="Total gasto" value={fmtMoney(totais.gasto)} cor="text-rise-700" />
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs uppercase text-gray-500">CO₂ da frota (fóssil)</p>
            <p className="text-2xl font-bold text-emerald-700">{fmtNum(totais.co2_fossil, 0)} kg</p>
            <p className="text-xs text-gray-400 mt-0.5">+ {fmtNum(totais.co2_bio, 0)} kg biogênico</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Placa / Prefixo / Modelo / Marca (busca ao digitar)"
            className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500" />
          <SearchableSelect value={obraId} onChange={(v) => { setObraId(v); aplicar({ obra_id: v || undefined }); }} options={optObras} placeholder="Todas as obras" className="min-w-[220px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        {/* Curva ABC + lista por veículo */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-200 bg-purple-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-purple-900">Curva ABC dos veículos</h3>
              <span className="text-xs text-gray-500">A:{contagem.A} · B:{contagem.B} · C:{contagem.C}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500 mr-1">Ordenar por:</span>
              <button onClick={() => setCriterio('co2')} className={`px-3 py-1 rounded-full font-medium ${criterio === 'co2' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>CO₂ emitido</button>
              <button onClick={() => setCriterio('gasto')} className={`px-3 py-1 rounded-full font-medium ${criterio === 'gasto' ? 'bg-rise-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Gasto (R$)</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2 w-14">Classe</th>
                  <th className="px-3 py-2">Veículo</th>
                  <th className="px-3 py-2">Placa / Chassi</th>
                  <th className="px-3 py-2 text-right">Litros</th>
                  <th className="px-3 py-2 text-right">Gasto (R$)</th>
                  <th className="px-3 py-2 text-right">CO₂ fóssil</th>
                  <th className="px-3 py-2 w-56">{criterio === 'co2' ? '% CO₂' : '% Gasto'} (acum.)</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {abc.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-8">Nenhum abastecimento no filtro atual.</td></tr>
                ) : abc.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{v.rank}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${classeCor[v.classe]}`}>{v.classe}</span></td>
                    <td className="px-3 py-2"><span className="font-semibold text-rise-700">{v.prefixo}</span> <span className="text-gray-600">{v.veiculo}</span></td>
                    <td className="px-3 py-2 text-gray-500">{v.placa_chassi}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(v.litros, 0)} L</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtMoney(v.gasto)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{fmtNum(v.co2_fossil, 0)} kg</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                          <div className={`h-2 rounded ${criterio === 'co2' ? 'bg-emerald-500' : 'bg-rise-500'}`} style={{ width: `${v.barra}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap w-24 text-right">{fmtNum(v.pct, 1)}% · {fmtNum(v.acum, 0)}%</span>
                      </div>
                    </td>
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
