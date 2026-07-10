import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';

const fmtMoney = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum   = (v, d = 0) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Admin/Frota/Abastecimentos/Index — painel do gerente (layout do diário):
 * gastos e CO₂ da frota por veículo, com curva ABC (absoluto) e ranking de
 * eficiência (CO₂/km·hr, R$/km·hr). Filtros GET: busca, obra, ano.
 */
export default function AbastecimentosIndex({ veiculos = [], totais = {}, obras = [], anos = [], filtros = {}, agora = '' }) {
  const [busca, setBusca] = useState(filtros.q ?? '');
  const [obraId, setObraId] = useState(filtros.obra_id ? String(filtros.obra_id) : '');
  const [ano, setAno] = useState(filtros.ano ? String(filtros.ano) : '');
  const [criterio, setCriterio] = useState('co2'); // co2 | gasto | efic_co2 | efic_gasto

  const aplicar = (extra = {}) => {
    router.get(route('admin.frota.abastecimentos.index'),
      { q: busca || undefined, obra_id: obraId || undefined, ano: ano || undefined, ...extra },
      { preserveState: true, preserveScroll: true });
  };
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setBusca(''); setObraId(''); setAno(''); router.get(route('admin.frota.abastecimentos.index'), {}, { preserveScroll: true }); };

  const optObras = useMemo(() => obras.map((o) => ({ value: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);
  const optAnos = useMemo(() => anos.map((a) => ({ value: a, label: String(a) })), [anos]);

  const isEfic = criterio.startsWith('efic');
  const metric = (v) => ({ co2: v.co2_fossil, gasto: v.gasto, efic_co2: v.co2_por_dist, efic_gasto: v.gasto_por_dist }[criterio]) ?? 0;

  // Absoluto → curva ABC (Pareto: % do total, acumulado, classe A/B/C).
  // Eficiência → ranking pelo valor por km·hr (só veículos com distância).
  const linhas = useMemo(() => {
    const arr = isEfic ? veiculos.filter((v) => metric(v) > 0) : veiculos;
    const ord = [...arr].sort((a, b) => metric(b) - metric(a));
    const total = ord.reduce((s, v) => s + metric(v), 0);
    const max = ord.length ? metric(ord[0]) : 0;
    let acum = 0;
    return ord.map((v, i) => {
      const val = metric(v);
      const pct = total > 0 ? (val / total) * 100 : 0;
      acum += pct;
      return { ...v, rank: i + 1, val, pct, acum, classe: acum <= 80 ? 'A' : acum <= 95 ? 'B' : 'C', barra: max > 0 ? (val / max) * 100 : 0 };
    });
  }, [veiculos, criterio]); // eslint-disable-line react-hooks/exhaustive-deps

  const classeCor = { A: 'bg-rose-100 text-rose-700', B: 'bg-amber-100 text-amber-700', C: 'bg-gray-100 text-gray-600' };
  const contagem = { A: linhas.filter((v) => v.classe === 'A').length, B: linhas.filter((v) => v.classe === 'B').length, C: linhas.filter((v) => v.classe === 'C').length };
  const corBarra = criterio.includes('co2') ? 'bg-emerald-500' : 'bg-rise-500';

  const Btn = ({ v, cor, children }) => (
    <button onClick={() => setCriterio(v)} className={`px-3 py-1 rounded-full font-medium ${criterio === v ? `${cor} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{children}</button>
  );

  return (
    <AuthenticatedLayout>
      <Head title="Abastecimentos — Frota" />

      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Abastecimentos — Frota</h1>
          <Link href={route('admin.frota.abastecimentos.create')} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo abastecimento</Link>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}{ano ? ` · Ano ${ano}` : ' · Todos os anos'}</p>

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
          <SearchableSelect value={ano} onChange={(v) => { setAno(v); aplicar({ ano: v || undefined }); }} options={optAnos} placeholder="Todos os anos" className="min-w-[150px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        {/* Curva ABC + lista por veículo */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-200 bg-purple-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-purple-900">{isEfic ? 'Ranking de eficiência' : 'Curva ABC dos veículos'}</h3>
              {!isEfic && <span className="text-xs text-gray-500">A:{contagem.A} · B:{contagem.B} · C:{contagem.C}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-gray-500 mr-1">Ordenar por:</span>
              <Btn v="co2" cor="bg-emerald-600">CO₂ emitido</Btn>
              <Btn v="gasto" cor="bg-rise-600">Gasto (R$)</Btn>
              <span className="mx-1 text-gray-300">|</span>
              <Btn v="efic_co2" cor="bg-emerald-600">CO₂ / km·hr</Btn>
              <Btn v="efic_gasto" cor="bg-rise-600">R$ / km·hr</Btn>
            </div>
          </div>
          {isEfic && <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">Eficiência ranqueada pela unidade de cada veículo (km ou hr); inclui apenas veículos com distância registrada nos abastecimentos.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2 w-14">Classe</th>
                  <th className="px-3 py-2">Veículo</th>
                  <th className="px-3 py-2 text-right">Litros</th>
                  <th className="px-3 py-2 text-right">Gasto (R$)</th>
                  <th className="px-3 py-2 text-right">CO₂ fóssil</th>
                  <th className="px-3 py-2 text-right">Consumo</th>
                  <th className="px-3 py-2 w-56">{isEfic ? (criterio === 'efic_co2' ? 'CO₂ / km·hr' : 'R$ / km·hr') : (criterio === 'co2' ? '% CO₂ (acum.)' : '% Gasto (acum.)')}</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {linhas.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-8">Nenhum abastecimento no filtro atual.</td></tr>
                ) : linhas.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{v.rank}</td>
                    <td className="px-3 py-2">{isEfic ? <span className="text-gray-300">—</span> : <span className={`px-2 py-0.5 rounded text-xs font-bold ${classeCor[v.classe]}`}>{v.classe}</span>}</td>
                    <td className="px-3 py-2"><span className="font-semibold text-rise-700">{v.prefixo}</span> <span className="text-gray-600">{v.veiculo}</span><span className="text-gray-400 text-xs ml-1">{v.placa_chassi}</span></td>
                    <td className="px-3 py-2 text-right">{fmtNum(v.litros, 0)} L</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtMoney(v.gasto)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{fmtNum(v.co2_fossil, 0)} kg</td>
                    <td className="px-3 py-2 text-right text-gray-600">{v.consumo != null ? `${fmtNum(v.consumo, 2)} ${v.consumo_unidade}` : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden"><div className={`h-2 rounded ${corBarra}`} style={{ width: `${v.barra}%` }} /></div>
                        <span className="text-xs text-gray-500 whitespace-nowrap w-28 text-right">
                          {isEfic
                            ? (criterio === 'efic_co2' ? `${fmtNum(v.val, 3)} kg/${v.unidade}` : `${fmtMoney(v.val)}/${v.unidade}`)
                            : `${fmtNum(v.pct, 1)}% · ${fmtNum(v.acum, 0)}%`}
                        </span>
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
