import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BarChart, DoughnutChart } from '@/Components/Charts';

/**
 * Admin Dashboard — porta da regra de negócio de
 * `engeativos2/resources/views/pages/dashboard/`.
 *
 * Manteve-se a hierarquia visual do legado:
 *   1. 5 KPI cards (Empresas, Obras, Funcionários, Fornecedores, Veículos)
 *   2. Tabela de vencimentos próximos / vencidos (unificando IPVA,
 *      Seguro, Doc Legal, Doc Técnico — substitui a calibração de
 *      ferramentas do legado).
 *   3. Grade 2x2 de gráficos:
 *        - Custo de manutenção mensal (ano atual)
 *        - Veículos por obra
 *        - Distribuição por situação (doughnut)
 *        - Manutenções por obra
 */

/* ------------ Helpers ------------ */
const fmtMoney = (v) => v != null
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : '—';
const fmtMoneyShort = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000)     return 'R$ ' + (n / 1_000).toFixed(1) + 'k';
  return 'R$ ' + n.toFixed(0);
};
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

/* ============================================================ */
export default function Dashboard({
  companies = [],
  currentCompany = null,
  kpis = {},
  vencimentos = [],
  charts = {},
}) {
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const vencimentosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return vencimentos;
    return vencimentos.filter((v) => v.tipo === filtroTipo);
  }, [vencimentos, filtroTipo]);

  const tiposDisponiveis = useMemo(() => {
    const set = new Set(vencimentos.map((v) => v.tipo));
    return ['todos', ...Array.from(set)];
  }, [vencimentos]);

  // ---------------- Datasets dos gráficos ----------------
  const custoMensal = charts.custo_mensal ?? {};
  const veiculosObra = charts.veiculos_por_obra ?? [];
  const situacoes    = charts.veiculos_por_situacao ?? [];
  const manutObra    = charts.manutencoes_por_obra ?? [];

  return (
    <AuthenticatedLayout header="Dashboard">
      <Head title="Dashboard" />

      <div className="p-6 w-full space-y-6">
        {/* ============ Cabeçalho ============ */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel — {currentCompany?.name ?? 'Sem empresa'}</h1>
            <p className="text-sm text-gray-500">Visão geral consolidada da operação</p>
          </div>
          {!currentCompany && (
            <Link href={route('companies.select')}
                  className="px-3 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 text-sm">
              Selecionar empresa
            </Link>
          )}
        </header>

        {/* ============ KPI Cards ============ */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard icon="🏢" label="Empresas"     value={kpis.empresas}     color="bg-indigo-100 text-indigo-700" />
          <KpiCard icon="⛑"  label="Obras"        value={kpis.obras}        color="bg-amber-100 text-amber-700" />
          <KpiCard icon="👥" label="Funcionários" value={kpis.funcionarios} color="bg-emerald-100 text-emerald-700" />
          <KpiCard icon="🚚" label="Fornecedores" value={kpis.fornecedores} color="bg-purple-100 text-purple-700" />
          <KpiCard icon="🚛" label="Veículos"     value={kpis.veiculos}     color="bg-blue-100 text-blue-700" />
        </div>

        {/* ============ Tabela de Vencimentos ============ */}
        <section className="bg-white border rounded-lg overflow-hidden">
          <header className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800">
              Vencimentos próximos (60 dias) e vencidos
              <span className="text-gray-400 text-sm font-normal ml-2">
                {vencimentosFiltrados.length} registro(s)
              </span>
            </h2>

            <div className="flex flex-wrap gap-1">
              {tiposDisponiveis.map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    filtroTipo === t
                      ? 'bg-rise-600 text-white border-rise-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t === 'todos' ? 'Todos' : t}
                </button>
              ))}
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="text-left">
                  <th className="px-4 py-2 font-semibold">Tipo</th>
                  <th className="px-4 py-2 font-semibold">Obra</th>
                  <th className="px-4 py-2 font-semibold">Veículo</th>
                  <th className="px-4 py-2 font-semibold">Descrição</th>
                  <th className="px-4 py-2 font-semibold text-center">Vencimento</th>
                  <th className="px-4 py-2 font-semibold text-center">Dias rest.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vencimentosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-8">
                    Nenhum vencimento próximo. 🎉
                  </td></tr>
                ) : vencimentosFiltrados.map((v, i) => {
                  const dias = Number(v.dias_restantes ?? 0);
                  const vencido = dias < 0;
                  const piscando = !vencido && dias <= 20;

                  return (
                    <tr key={i} className={vencido ? 'bg-red-50' : piscando ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${corPorTipo(v.tipo)}`}>
                          {v.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{v.obra ?? '—'}</td>
                      <td className="px-4 py-2 font-semibold">
                        <Link
                          href={route('admin.frota.veiculos.show', v.veiculo_id)}
                          className="text-blue-700 hover:underline"
                        >
                          {v.prefixo}
                          {v.placa && <span className="text-gray-400 ml-1 font-normal">({v.placa})</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-600 truncate max-w-xs">{v.descricao}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 ${piscando ? 'animate-pulse' : ''}`}>
                          {piscando && <span className="w-2 h-2 rounded-full bg-red-500" />}
                          {fmtData(v.data_vencimento)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {vencido
                          ? <span className="text-xs font-bold text-red-700">Venceu há {Math.abs(dias)}d</span>
                          : <span className={`text-xs font-bold ${piscando ? 'text-red-700' : 'text-gray-700'}`}>{dias}d</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============ Grade 2x2 de gráficos ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="bg-white border rounded-lg p-4 flex flex-col">
            <BarChart
              title={`Custo de Manutenção Mensal — ${custoMensal.ano ?? ''}`}
              labels={custoMensal.meses ?? []}
              values={custoMensal.valores ?? []}
              color="#fb923c"
              colorGradient={['#fb923c', '#ea580c']}
              formatter={fmtMoney}
              yFormatter={fmtMoneyShort}
            />
          </div>

          <div className="bg-white border rounded-lg p-4 flex flex-col">
            <BarChart
              title="Veículos por Obra"
              labels={veiculosObra.map((r) => r.obra)}
              values={veiculosObra.map((r) => r.total)}
              color="#6366f1"
              colorGradient={['#818cf8', '#4f46e5']}
              rotated
            />
          </div>

          <div className="bg-white border rounded-lg p-4 flex flex-col">
            <DoughnutChart
              title="Distribuição de Veículos por Situação"
              labels={situacoes.map((r) => r.situacao)}
              values={situacoes.map((r) => r.total)}
              unit="veículos"
            />
          </div>

          <div className="bg-white border rounded-lg p-4 flex flex-col">
            <BarChart
              title="Manutenções por Obra (qtd vs custo)"
              labels={manutObra.map((r) => r.obra)}
              datasets={[
                { label: 'Quantidade', values: manutObra.map((r) => r.qtd),   color: '#6366f1', gradient: ['#818cf8', '#4f46e5'] },
                { label: 'Custo (R$)', values: manutObra.map((r) => r.custo), color: '#fb923c', gradient: ['#fb923c', '#ea580c'] },
              ]}
              formatter={(v) => Number(v).toLocaleString('pt-BR')}
              yFormatter={(v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              rotated
              legend
            />
          </div>
        </div>

        {/* ============ Minhas empresas (legado simplificado) ============ */}
        {companies.length > 1 && (
          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold text-gray-800 mb-2">Minhas empresas</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {companies.map((c) => (
                <li
                  key={c.id}
                  className={`px-3 py-1 rounded-full border ${
                    currentCompany?.id === c.id
                      ? 'bg-rise-50 text-rise-700 border-rise-200 font-semibold'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {c.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

/* ============ Helpers ============ */
function KpiCard({ icon, label, value, color }) {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase text-gray-500 tracking-wide font-semibold">{label}</p>
        <p className="text-2xl font-bold text-gray-800 tabular-nums">{Number(value ?? 0).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}

function corPorTipo(tipo) {
  switch (tipo) {
    case 'IPVA':        return 'bg-amber-100 text-amber-700';
    case 'Seguro':      return 'bg-blue-100 text-blue-700';
    case 'Doc Legal':   return 'bg-purple-100 text-purple-700';
    case 'Doc Técnico': return 'bg-emerald-100 text-emerald-700';
    default:            return 'bg-gray-100 text-gray-700';
  }
}
