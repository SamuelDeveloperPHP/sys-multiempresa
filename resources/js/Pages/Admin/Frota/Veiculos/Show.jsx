import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/* ============ helpers de formatação ============ */
const fmtMoney = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtNum   = (v, dec = 0) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
// Datas "YYYY-MM-DD" (date-only) precisam ser lidas como hora LOCAL; new Date(s)
// as interpreta como UTC e, em fuso -03, exibe o dia anterior (off-by-one).
const fmtData  = (d) => {
  if (!d) return '—';
  const s = String(d);
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  return dt.toLocaleDateString('pt-BR');
};

const situacaoCorretiva = {
  1: { label: 'Pendente',     cor: 'bg-amber-100 text-amber-800' },
  2: { label: 'Em Execução',  cor: 'bg-blue-100 text-blue-700' },
  3: { label: 'Concluído',    cor: 'bg-green-100 text-green-700' },
  4: { label: 'Cancelado',    cor: 'bg-red-100 text-red-700' },
};

const corValidade = (dias) => {
  if (dias === null || dias === undefined) return { label: 'Não possui', cor: 'bg-gray-200 text-gray-700' };
  if (dias < 0)   return { label: `Vencido há ${Math.abs(dias)}d`, cor: 'bg-gray-900 text-white' };
  if (dias === 0) return { label: 'Vence hoje', cor: 'bg-red-600 text-white' };
  if (dias < 15)  return { label: `${dias}d`, cor: 'bg-red-100 text-red-700' };
  if (dias < 40)  return { label: `${dias}d`, cor: 'bg-amber-100 text-amber-800' };
  return { label: `${dias}d`, cor: 'bg-green-100 text-green-700' };
};

/* Status de vencimento: barra que enche conforme se aproxima do vencimento.
   Janela de referência de 90 dias — a barra sai de 0% (>=90d restantes) até
   100% (vencido). Cores: verde → âmbar → vermelho → preto (vencido). */
const JANELA_VENCIMENTO_DIAS = 90;
const statusVencimento = (dias) => {
  if (dias === null || dias === undefined) {
    return { label: 'Sem validade', percent: 0, barra: 'bg-gray-300', texto: 'text-gray-500' };
  }
  if (dias < 0) {
    return { label: `Vencido há ${Math.abs(dias)}d`, percent: 100, barra: 'bg-gray-900', texto: 'text-gray-900' };
  }
  const percent = Math.min(100, Math.max(4, Math.round((1 - dias / JANELA_VENCIMENTO_DIAS) * 100)));
  if (dias === 0) return { label: 'Vence hoje', percent: 100, barra: 'bg-red-600', texto: 'text-red-700' };
  if (dias < 15)  return { label: `Faltam ${dias}d`, percent, barra: 'bg-red-500', texto: 'text-red-700' };
  if (dias < 40)  return { label: `Faltam ${dias}d`, percent, barra: 'bg-amber-500', texto: 'text-amber-700' };
  return { label: `Faltam ${dias}d`, percent, barra: 'bg-green-500', texto: 'text-green-700' };
};

const TABS = [
  { id: 'detalhes',       label: 'Detalhes',            icon: 'fa-circle-info' },
  { id: 'galeria',        label: 'Biblioteca',          icon: 'fa-images' },
  { id: 'docs_tecnicos',  label: "Doc's Técnicos",      icon: 'fa-file-lines' },
  { id: 'docs_legais',    label: "Doc's Legais",        icon: 'fa-file-contract' },
  { id: 'corretivas',     label: 'Corretivas',          icon: 'fa-screwdriver-wrench' },
  { id: 'preventivas',    label: 'Preventivas',         icon: 'fa-wrench' },
  { id: 'seguros',        label: 'Seguros',             icon: 'fa-shield-halved' },
  { id: 'ipvas',          label: "IPVA's",              icon: 'fa-file-invoice-dollar' },
  { id: 'depreciacao',    label: 'Depreciação',         icon: 'fa-arrow-trend-down' },
  { id: 'tacografo',      label: 'Tacógrafo',           icon: 'fa-stopwatch' },
  { id: 'pneus',          label: 'Pneus',               icon: 'fa-life-ring' },
  { id: 'abastecimentos', label: 'Abastecimentos',      icon: 'fa-gas-pump' },
  { id: 'medicoes',       label: 'Hodômetro/Horímetro', icon: 'fa-gauge-high' },
];

/* ============================================================
 * Reutilizáveis das abas: lista paginada do servidor (GET) com
 * busca as-you-type + paginação. Usado por Corretivas, Seguros,
 * IPVA, Abastecimentos e Medições (mesmo padrão dos Docs).
 * ============================================================ */
function useServerList(routeName, veiculoId) {
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setBuscaDebounced(busca); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const url = route(routeName, { veiculo: veiculoId, q: buscaDebounced || undefined, page });
      const { data } = await window.axios.get(url);
      setRows(data.data || []);
      setMeta(data.meta || { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
      setResumo(data.resumo ?? null);
    } catch (e) {
      console.error('[useServerList]', routeName, e);
      setRows([]);
    } finally { setLoading(false); }
  }, [routeName, veiculoId, buscaDebounced, page]);

  useEffect(() => { carregar(); }, [carregar]);

  return { rows, meta, resumo, loading, busca, setBusca, buscaDebounced, page, setPage, reload: carregar };
}

function BuscaField({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500 w-56" />
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
    </div>
  );
}

function Paginacao({ meta, loading, onPage }) {
  return (
    <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
      <span>{meta.total > 0 ? `Mostrando ${meta.from}–${meta.to} de ${meta.total} registro(s)` : '—'}</span>
      <div className="flex items-center gap-1">
        <button disabled={meta.current_page <= 1 || loading} onClick={() => onPage(Math.max(1, meta.current_page - 1))}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Anterior</button>
        <span className="px-2">Página {meta.current_page} de {meta.last_page}</span>
        <button disabled={meta.current_page >= meta.last_page || loading} onClick={() => onPage(Math.min(meta.last_page, meta.current_page + 1))}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Próximo</button>
      </div>
    </div>
  );
}

export default function VeiculoShow({
  veiculo,
  preventivas = [],
  dashboard_ciclos: dashboardCiclos = null,
  fornecedores = [],
  obras = [],
  funcionarios = [],
  combustiveis = [],
  // Porting de `detalhes.blade.php`
  maior_valor: maiorValor = null,
  meses_formatados: mesesFormatados = [],
  total_manutencao_veiculo: totalManutencaoVeiculo = [],
  custo_anual_manutencao: custoAnualManutencao = [],
  custo_mensal_ano_atual: custoMensalAnoAtual = null,
}) {
  const { flash } = usePage().props;
  const [tab, setTab] = useState('detalhes');

  return (
    <AuthenticatedLayout>
      <Head title={`Veículo ${veiculo.prefixo}`} />

      <div className="p-6 w-full">
        {/* Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={route('admin.frota.veiculos.index')}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            ← Voltar para a lista
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-3">
            <span>{veiculo.prefixo}</span>
            <span className={`px-3 py-1 rounded-full text-sm ${veiculo.situacao === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
              {veiculo.situacao || '—'}
            </span>
          </h1>
          <div className="flex gap-2">
            <a
              href={route('admin.frota.veiculos.zip-docs', veiculo.id)}
              target="_blank" rel="noreferrer"
              className="px-3 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 text-sm"
            >
              ☁ Baixar ZIP docs
            </a>
            <Link
              href={route('admin.frota.veiculos.historico-mnt', veiculo.id)}
              className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            >
              📜 Caderno Histórico
            </Link>
            <Link
              href={route('admin.frota.veiculos.edit', veiculo.id)}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Editar dados
            </Link>
          </div>
        </div>

        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
        )}

        {/* Tabs nav */}
        <div className="bg-white border rounded-t-lg overflow-x-auto">
          <nav className="flex border-b min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? 'border-rise-600 text-rise-700 bg-rise-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <i className={`fa-solid ${t.icon} mr-2 text-[13px] ${tab === t.id ? 'text-rise-600' : 'text-gray-400'}`} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tabs content */}
        <div className="bg-white border border-t-0 rounded-b-lg p-6">
          {tab === 'detalhes'       && (
            <TabDetalhes
              veiculo={veiculo}
              maiorValor={maiorValor}
              totalManutencaoVeiculo={totalManutencaoVeiculo}
              custoAnualManutencao={custoAnualManutencao}
              custoMensalAnoAtual={custoMensalAnoAtual}
              mesesFormatados={mesesFormatados}
            />
          )}
          {tab === 'galeria'        && <TabGaleria veiculo={veiculo} />}
          {tab === 'docs_tecnicos'  && <TabDocs tipo="técnicos" veiculo={veiculo} />}
          {tab === 'docs_legais'    && <TabDocs tipo="legais" veiculo={veiculo} />}
          {tab === 'corretivas'     && <TabCorretivas veiculo={veiculo} fornecedores={fornecedores} obras={obras} funcionarios={funcionarios} />}
          {tab === 'preventivas'    && <TabPreventivas registros={preventivas} dashboard={dashboardCiclos} veiculo={veiculo} fornecedores={fornecedores} obras={obras} funcionarios={funcionarios} />}
          {tab === 'seguros'        && <TabSeguros veiculo={veiculo} />}
          {tab === 'ipvas'          && <TabIpvas veiculo={veiculo} />}
          {tab === 'depreciacao'    && <TabDepreciacao veiculo={veiculo} />}
          {tab === 'tacografo'      && <TabTacografo veiculo={veiculo} />}
          {tab === 'pneus'          && <TabPneus veiculo={veiculo} />}
          {tab === 'abastecimentos' && <TabAbastecimentos veiculo={veiculo} obras={obras} funcionarios={funcionarios} combustiveis={combustiveis} />}
          {tab === 'medicoes'       && <TabMedicoes veiculo={veiculo} obras={obras} funcionarios={funcionarios} />}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ============================================================
 * TAB: Detalhes — porta do legacy `detalhes.blade.php`
 *   - Header com 3 cards (Imagem / Dados+KPI / Condutor+Locação)
 *   - Timeline horizontal das locações (com setas prev/next)
 *   - 3 gráficos SVG: custo mensal (ano atual), qtd corretivas/ano,
 *     custo anual de corretivas
 *   - Mantém as seções extras já existentes (FIPE, Operação inicial,
 *     Observação) abaixo do bloco do legacy.
 * ============================================================ */
function TabDetalhes({
  veiculo,
  maiorValor,
  totalManutencaoVeiculo,
  custoAnualManutencao,
  custoMensalAnoAtual,
  mesesFormatados,
}) {
  const locacao = veiculo.locacao_atual ?? null;
  const funcDest = locacao?.funcionario_destino ?? null;

  // KPI Medição (legacy: $labelMedicao / $valorMedicao / $iconMedicao)
  const labelMedicao  = veiculo.tipo_hr ? 'Horímetro' : veiculo.tipo_km ? 'Hodômetro' : veiculo.tipo_tempo ? 'Tempo' : 'Medição';
  const valorMedicao  = veiculo.tipo_hr ? (maiorValor?.horimetro_novo ?? 0)
                      : veiculo.tipo_km ? (maiorValor?.quilometragem_nova ?? 0)
                      : veiculo.tipo_tempo ? (maiorValor?.tempo_novo ?? 0)
                      : 0;
  const iconeMedicao  = veiculo.tipo_hr ? '⏱' : veiculo.tipo_km ? '🚗' : veiculo.tipo_tempo ? '🕒' : 'ℹ';

  return (
    <div className="space-y-6">
      {/* ============ Header: 3 cards ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Foto + marca/ano */}
        <div className="lg:col-span-4">
          <div className="bg-white border rounded-lg h-full flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Imagem</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={route('admin.frota.veiculos.imagem-principal', veiculo.id)}
                  alt="Imagem do veículo"
                  className="rounded-lg border max-h-72 object-cover w-full"
                />
              </div>
              <div className="mt-3 text-center">
                <div className="font-semibold">
                  {veiculo.marca ?? '—'} <span className="text-gray-400">•</span> {veiculo.ano ?? '—'}
                </div>
                <div className="text-gray-500 text-sm">{veiculo.placa ?? veiculo.nun_serie_chassi ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dados do veículo + KPI medição */}
        <div className="lg:col-span-3">
          <div className="bg-white border rounded-lg h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-green-700">
                {veiculo.tipo_hr ? 'Dados da máquina' : 'Dados do veículo'}
              </h3>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <ul className="divide-y text-sm">
                <RowKV label="Prefixo"        value={veiculo.prefixo} />
                <RowKV label="Marca"          value={veiculo.marca} />
                <RowKV label="Modelo"         value={veiculo.modelo} />
                <RowKV label="Ano"            value={veiculo.ano} />
                <RowKV label="Placa / Chassi" value={veiculo.placa ?? veiculo.nun_serie_chassi} />
                <RowKV label="Valor FIPE"     value={fmtMoney(veiculo.valor_fipe)} />
              </ul>

              <div className="mt-4 p-3 rounded-lg bg-green-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-lg">
                  {iconeMedicao}
                </div>
                <div>
                  <p className="text-xs text-gray-600 m-0">{labelMedicao}</p>
                  <p className="text-xl font-bold m-0">{fmtNum(valorMedicao)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Condutor / Locação */}
        <div className="lg:col-span-5">
          <div className="bg-white border rounded-lg h-full flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-green-700">Condutor do Veículo</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                locacao ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {locacao ? 'Locação ativa' : 'Sem locação'}
              </span>
            </div>
            <div className="p-4 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{funcDest?.nome ?? 'N/A'}</div>
                  <div className="text-gray-500 text-sm">Responsável atual</div>
                </div>
                <img
                  src={funcDest?.id
                    ? route('admin.frota.locacoes.funcionario-foto', funcDest.id)
                    : ''}
                  alt="Funcionário"
                  className="w-20 h-20 rounded-full border object-cover bg-gray-50"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
              </div>

              <hr className="my-3" />

              {!locacao ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 rounded">
                  Este veículo não possui locação ativa cadastrada no momento.
                </div>
              ) : (
                <ul className="divide-y text-sm">
                  <RowKV label="Contato" value={funcDest?.celular ?? 'N/A'} />
                  <RowKV label="Início"  value={fmtData(locacao.data_inicio)} />
                  <RowKV label="Término" value={fmtData(locacao.data_fim)} />
                  <li className="py-2">
                    <div className="text-gray-500 text-xs">Obra de Origem</div>
                    <div className="font-semibold">
                      {locacao.obra_origem?.codigo_obra ?? locacao.obra_origem?.nome_fantasia ?? 'N/A'}
                    </div>
                  </li>
                  <li className="py-2">
                    <div className="text-gray-500 text-xs">Obra de Destino</div>
                    <div className="font-semibold text-green-700">
                      {locacao.obra_destino?.codigo_obra ?? locacao.obra_destino?.nome_fantasia ?? 'N/A'}
                    </div>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Timeline horizontal de locações ============ */}
      <TimelineLocacoes locacoes={veiculo.locacoes ?? []} />

      {/* ============ Gráficos ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="bg-white border rounded-lg p-4 flex flex-col">
          <BarChart
            title={`Custo Mensal (Corretiva) — ${custoMensalAnoAtual?.label?.split(' ').pop() ?? ''}`}
            labels={mesesFormatados}
            values={custoMensalAnoAtual?.data ?? []}
            color="#fd7e14"
            colorGradient={['#fb923c', '#ea580c']}
            formatter={fmtMoney}
            yFormatter={fmtMoneyShort}
          />
        </div>

        <div className="bg-white border rounded-lg p-4 flex flex-col">
          <DoughnutChart
            title="Manutenções Corretivas por Ano"
            labels={(totalManutencaoVeiculo ?? []).map((r) => r.ano)}
            values={(totalManutencaoVeiculo ?? []).map((r) => r.total)}
          />
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 flex flex-col">
        <BarChart
          title="Custo Anual com Corretivas"
          labels={(custoAnualManutencao ?? []).map((r) => r.mesCustoAnoManut)}
          values={(custoAnualManutencao ?? []).map((r) => r.custoAnoManut)}
          color="#fd7e14"
          colorGradient={['#fb923c', '#ea580c']}
          formatter={fmtMoney}
          yFormatter={fmtMoneyShort}
          rotated
        />
      </div>

      {/* ============ Seções extras já existentes ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Identificação completa" className="lg:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Info label="Categoria" value={veiculo.categoria?.nome_categoria} />
            <Info label="Subcategoria" value={veiculo.subcategoria?.nome_subcategoria} />
            <Info label="Tipo" value={veiculo.tipo} />
            <Info label="Renavam" value={veiculo.renavam} mono />
            <Info label="Nº Série / Chassi" value={veiculo.nun_serie_chassi} mono />
            <Info label="Obra base" value={veiculo.obra?.nome_fantasia} />
            <Info label="Plano preventiva" value={veiculo.preventiva?.nome_preventiva} />
            <Info label="Descrição livre" value={veiculo.veiculo} />
          </div>
        </Card>

        <Card title="Valor / FIPE" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Info label="Valor FIPE"      value={fmtMoney(veiculo.valor_fipe)} />
            <Info label="Valor Aquisição" value={fmtMoney(veiculo.valor_aquisicao)} />
            <Info label="Valor Mercado"   value={fmtMoney(veiculo.valor_mercado)} />
            <Info label="Código FIPE"     value={veiculo.codigo_fipe} />
            <Info label="Mês ref. FIPE"   value={veiculo.fipe_mes_referencia} />
            <Info label="Mês aquisição"   value={veiculo.mes_aquisicao} />
          </div>
        </Card>

        <Card title="Operação inicial">
          <div className="grid grid-cols-1 gap-4">
            <Info label="Horímetro inicial"     value={veiculo.horimetro_inicial} />
            <Info label="Quilometragem inicial" value={veiculo.quilometragem_inicial} />
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Medições ativas</p>
              <div className="flex flex-wrap gap-1">
                {veiculo.tipo_hr && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">Horímetro</span>}
                {veiculo.tipo_km && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Hodômetro</span>}
                {veiculo.tipo_tempo && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">Tempo</span>}
                {!veiculo.tipo_hr && !veiculo.tipo_km && !veiculo.tipo_tempo && <span className="text-gray-400">—</span>}
              </div>
            </div>
          </div>
        </Card>

        {veiculo.observacao && (
          <Card title="Observação" className="lg:col-span-3">
            <p className="whitespace-pre-wrap text-gray-700">{veiculo.observacao}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============ Componentes auxiliares do TabDetalhes ============ */

const fmtMoneyShort = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000)     return 'R$ ' + (n / 1_000).toFixed(1) + 'k';
  return 'R$ ' + n.toFixed(0);
};

function RowKV({ label, value }) {
  return (
    <li className="flex justify-between py-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-right truncate max-w-[60%]">{value ?? '—'}</span>
    </li>
  );
}

/* ----- Timeline horizontal de locações (porta `.htl-*` do legacy) ----- */
function TimelineLocacoes({ locacoes }) {
  const scrollRef = useRef(null);
  // Ordem decrescente: mais recente primeiro (esquerda → direita)
  const lista = (locacoes ?? []).slice().sort((a, b) => {
    const da = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
    const db = b.data_inicio ? new Date(b.data_inicio).getTime() : 0;
    return db - da;
  });

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 380, behavior: 'smooth' });
  };

  const fmtMesAno = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  if (lista.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-500">
        <h3 className="font-semibold text-gray-700 mb-1">Timeline de Locações</h3>
        Nenhuma locação registrada para este veículo.
      </div>
    );
  }

  return (
    <div className="relative bg-gray-50 border rounded-xl p-4 md:p-5">
      <h3 className="font-bold text-gray-800 mb-3 px-1">Timeline de Locações</h3>

      <button
        type="button"
        onClick={() => scroll(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-indigo-700 text-white text-xl shadow-lg hover:bg-indigo-800"
        aria-label="Anterior"
      >‹</button>
      <button
        type="button"
        onClick={() => scroll(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-indigo-700 text-white text-xl shadow-lg hover:bg-indigo-800"
        aria-label="Próximo"
      >›</button>

      <div ref={scrollRef} className="relative overflow-x-auto px-14 scrollbar-thin" style={{ scrollBehavior: 'smooth' }}>
        {/* linha central */}
        <div className="absolute left-14 right-14 top-1/2 h-0.5 bg-gray-300 rounded -translate-y-1/2 pointer-events-none" />

        <div className="flex gap-12 items-center py-2" style={{ minHeight: 280 }}>
          {lista.map((loc, i) => {
            const top   = i % 2 === 0;
            const ativa = !loc.data_fim;
            const inicio = loc.data_inicio ? new Date(loc.data_inicio) : null;
            const fim    = loc.data_fim ? new Date(loc.data_fim) : null;
            const obra   = loc.obra_destino?.codigo_obra ?? loc.obra_destino?.nome_fantasia ?? '...';

            return (
              <div key={loc.id ?? i} className="relative flex-shrink-0" style={{ width: 280 }}>
                {/* dot */}
                <div className={`absolute left-1/2 top-1/2 w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 ring-4 ${
                  ativa ? 'bg-green-500 ring-green-200' : 'bg-indigo-600 ring-indigo-200'
                }`} />

                {/* card */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-72 rounded-lg shadow-md text-center px-4 py-3 ${
                    ativa ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
                  }`}
                  style={top ? { top: 28 } : { bottom: 28 }}
                >
                  <div className="text-xs text-gray-500 mb-1 capitalize">{fmtMesAno(inicio)}</div>
                  <div className="font-bold text-gray-800 mb-1 truncate">{obra}</div>
                  <div className="text-xs flex items-center justify-center gap-2">
                    <span className="text-green-700">📅 {inicio ? inicio.toLocaleDateString('pt-BR') : 'N/A'}</span>
                    <span className="text-gray-300">•</span>
                    <span className={ativa ? 'text-amber-600' : 'text-red-600'}>
                      📅 {fim ? fim.toLocaleDateString('pt-BR') : 'Em andamento'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * BarChart SVG puro (sem dependência) — versão polida.
 *  - Tipografia: Arial 11px (uniforme).
 *  - Eixo Y com escala "nice" mais justa (3, 4, 6, 8, 10 multipliers).
 *  - Barras com gradiente vertical e topo arredondado.
 *  - preserveAspectRatio padrão (não distorce textos).
 *  - Altura fixa 320px no container (mesma p/ todos os gráficos
 *    do mesmo grid → alinhamento garantido).
 * ============================================================ */
function BarChart({ title, labels, values, color = '#6366f1', colorGradient, formatter, yFormatter, rotated = false }) {
  const data = (labels ?? []).map((l, i) => ({ label: String(l ?? ''), value: Number(values?.[i] ?? 0) }));
  const hasData = data.some((d) => d.value !== 0);

  // viewBox proporcional ao container (≈ 2.4:1)
  const W = 760, H = 320;
  const padL = 70, padR = 20, padT = 36, padB = rotated ? 78 : 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Escala "nice" mais granular → reduz folga em cima das barras
  const niceMax = (v) => {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const f   = v / exp;
    const niceF =
      f <= 1   ? 1   :
      f <= 1.5 ? 1.5 :
      f <= 2   ? 2   :
      f <= 3   ? 3   :
      f <= 4   ? 4   :
      f <= 5   ? 5   :
      f <= 6   ? 6   :
      f <= 8   ? 8   : 10;
    return niceF * exp;
  };
  const maxV = Math.max(0.0001, ...data.map((d) => d.value));
  const yMax = niceMax(maxV * 1.1); // 10% de respiro para o datalabel

  const step = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.max(10, step * 0.55);
  const yTicks = 4;

  const valFmt = formatter ?? ((v) => Number(v).toLocaleString('pt-BR'));
  const yFmt   = yFormatter ?? valFmt;

  // Define id único do gradiente (evita colisão se houver vários BarCharts)
  const gradId = useMemo(() => 'bar-grad-' + Math.random().toString(36).slice(2, 8), []);
  const [c1, c2] = colorGradient ?? [color, color];

  return (
    <>
      <h4 className="text-gray-700 mb-2"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 700 }}>
        {title}
      </h4>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 border border-dashed rounded"
             style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, minHeight: 280 }}>
          Sem dados para exibir.
        </div>
      ) : (
        <div className="flex-1 w-full" style={{ height: 320 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
            </defs>

            {/* grid horizontal + labels do eixo Y */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const v = (yMax * (yTicks - i)) / yTicks;
              const y = padT + (innerH * i) / yTicks;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={y} y2={y}
                        stroke="#eef0f4" strokeDasharray="4 4" />
                  <text
                    x={padL - 10} y={y + 4} textAnchor="end" fill="#9aa0ad"
                    fontFamily="Arial, sans-serif" fontSize="11"
                  >
                    {yFmt(v)}
                  </text>
                </g>
              );
            })}

            {/* barras */}
            {data.map((d, i) => {
              const x = padL + step * i + (step - barW) / 2;
              const h = (d.value / yMax) * innerH;
              const y = padT + innerH - h;
              return (
                <g key={i}>
                  <title>{`${d.label}: ${valFmt(d.value)}`}</title>
                  {d.value > 0 && (
                    <rect
                      x={x} y={y} width={barW} height={h}
                      fill={`url(#${gradId})`} rx="4" ry="4"
                    />
                  )}
                  {d.value > 0 && (
                    <text
                      x={x + barW / 2} y={y - 8} textAnchor="middle"
                      fill="#3f4654" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700"
                    >
                      {valFmt(d.value)}
                    </text>
                  )}
                  {/* label do eixo X */}
                  <text
                    x={x + barW / 2}
                    y={H - padB + 20}
                    textAnchor={rotated ? 'end' : 'middle'}
                    fill={d.value > 0 ? '#495057' : '#adb5bd'}
                    fontFamily="Arial, sans-serif" fontSize="11"
                    transform={rotated ? `rotate(-40, ${x + barW / 2}, ${H - padB + 20})` : undefined}
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}

            {/* baseline */}
            <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#dde1e7" />
          </svg>
        </div>
      )}
    </>
  );
}

/* ============================================================
 * DoughnutChart SVG puro — paleta fixa, legenda lateral.
 * ============================================================ */
function DoughnutChart({ title, labels, values }) {
  const items = (labels ?? []).map((l, i) => ({
    label: String(l ?? ''),
    value: Number(values?.[i] ?? 0),
  })).filter((d) => d.value > 0);

  const total = items.reduce((s, d) => s + d.value, 0);

  // Paleta consistente (amarelos/laranjas/indigo) que casa com os outros gráficos
  const palette = ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#a855f7', '#6366f1', '#06b6d4', '#10b981'];

  // Geometria do anel
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const rOuter = 95;
  const rInner = 60;

  // Converte percentual em SVG arc path
  const arcPath = (startPct, endPct) => {
    const a0 = startPct * 2 * Math.PI - Math.PI / 2;
    const a1 = endPct   * 2 * Math.PI - Math.PI / 2;
    const x0o = cx + rOuter * Math.cos(a0), y0o = cy + rOuter * Math.sin(a0);
    const x1o = cx + rOuter * Math.cos(a1), y1o = cy + rOuter * Math.sin(a1);
    const x0i = cx + rInner * Math.cos(a1), y0i = cy + rInner * Math.sin(a1);
    const x1i = cx + rInner * Math.cos(a0), y1i = cy + rInner * Math.sin(a0);
    const large = endPct - startPct > 0.5 ? 1 : 0;
    return [
      `M ${x0o} ${y0o}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o}`,
      `L ${x0i} ${y0i}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${x1i} ${y1i}`,
      'Z',
    ].join(' ');
  };

  let acc = 0;
  const slices = items.map((d, i) => {
    const start = acc / total;
    acc += d.value;
    const end = acc / total;
    return {
      ...d,
      color: palette[i % palette.length],
      pct: total > 0 ? (d.value / total) * 100 : 0,
      path: total > 0 ? arcPath(start, end) : null,
    };
  });

  return (
    <>
      <h4 className="text-gray-700 mb-2"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 700 }}>
        {title}
      </h4>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 border border-dashed rounded"
             style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, minHeight: 280 }}>
          Sem dados para exibir.
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-6" style={{ minHeight: 280 }}>
          {/* Rosca */}
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
              {slices.length === 1 ? (
                <>
                  <circle cx={cx} cy={cy} r={rOuter} fill={slices[0].color} />
                  <circle cx={cx} cy={cy} r={rInner} fill="#ffffff" />
                </>
              ) : (
                slices.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color}>
                    <title>{`${s.label}: ${s.value} (${s.pct.toFixed(1)}%)`}</title>
                  </path>
                ))
              )}
            </svg>
            {/* Texto central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                 style={{ fontFamily: 'Arial, sans-serif' }}>
              <span className="text-gray-500" style={{ fontSize: 11 }}>Total</span>
              <span className="font-bold text-gray-800" style={{ fontSize: 24, lineHeight: 1 }}>{total}</span>
              <span className="text-gray-500" style={{ fontSize: 11 }}>corretivas</span>
            </div>
          </div>

          {/* Legenda */}
          <ul className="flex-1 space-y-1.5" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
            {slices.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ background: s.color }} />
                <span className="text-gray-700 font-semibold w-12">{s.label}</span>
                <span className="text-gray-500 flex-1">{s.value} ocorrências</span>
                <span className="text-gray-700 font-bold tabular-nums">{s.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/* ============ TAB: Galeria ============ */
function TabGaleria({ veiculo }) {
  const inputRef = useRef(null);
  const upload = useForm({ imagens: [] });

  const enviar = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    upload.setData('imagens', files);
    upload.post(route('admin.frota.veiculos.imagens.store', veiculo.id), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        upload.reset();
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  };

  const remover = (img) => {
    if (!confirm('Remover esta imagem?')) return;
    router.delete(route('admin.frota.veiculos.imagens.destroy', img.id), { preserveScroll: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Galeria ({veiculo.imagens?.length ?? 0})</h2>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" multiple ref={inputRef} onChange={enviar} className="text-sm" />
          {upload.processing && <span className="text-sm text-gray-500">Enviando...</span>}
        </div>
      </div>

      {veiculo.imagens?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {veiculo.imagens.map((img) => (
            <div key={img.id} className="relative group">
              <img src={route('admin.frota.veiculos.imagens.view', [veiculo.id, img.id])} alt="" className="w-full h-32 object-cover rounded border" />
              <button
                onClick={() => remover(img)}
                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
              >
                Remover
              </button>
              {img.descricao && <p className="text-xs text-gray-600 mt-1 truncate">{img.descricao}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Nenhuma imagem na galeria.</p>
      )}
    </div>
  );
}

/* ============ TAB: Docs (Técnicos / Legais) ============
 * Auto-suficiente: busca a listagem via GET paginado (busca as-you-type +
 * filtro de obsoletos). A lista principal mostra só documentos ATIVOS; o
 * botão "Ver obsoletos" alterna para os fora de uso. Coluna Obsoleto tem um
 * toggle que tira/traz o documento do uso; coluna Status mostra barra de
 * proximidade do vencimento. */
function TabDocs({ tipo, veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const isLegal = tipo === 'legais';
  const routeNamePrefix = isLegal ? 'docs-legais' : 'docs-tecnicos';
  const anexoTipo = isLegal ? 'doc-legal' : 'doc-tecnico';

  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [verObsoletos, setVerObsoletos] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Debounce da busca (pesquisa conforme digita, sem estourar requests)
  useEffect(() => {
    const t = setTimeout(() => { setBuscaDebounced(busca); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const url = route(`admin.frota.veiculos.${routeNamePrefix}.list`, {
        veiculo: veiculo.id,
        q: buscaDebounced || undefined,
        obsoletos: verObsoletos ? 1 : 0,
        page,
      });
      const { data } = await window.axios.get(url);
      setRows(data.data || []);
      setMeta(data.meta || { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
    } catch (e) {
      console.error('[TabDocs] falha ao carregar', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [routeNamePrefix, veiculo.id, buscaDebounced, verObsoletos, page]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (d) => { setEditando(d); setShowForm(true); };

  const onSaved = () => { setShowForm(false); carregar(); };

  const excluir = (d) => {
    if (!confirm('Remover este documento?')) return;
    router.delete(route(`admin.frota.${routeNamePrefix}.destroy`, d.id), {
      preserveScroll: true,
      onSuccess: carregar,
    });
  };

  const toggleObsoleto = async (d) => {
    const novo = !d.obsoleto;
    setTogglingId(d.id);
    try {
      await window.axios.patch(
        route(`admin.frota.${routeNamePrefix}.obsoleto`, d.id),
        { obsoleto: novo ? 1 : 0 }
      );
      // O documento sai da visão atual (ativo↔obsoleto) — recarrega a página.
      carregar();
    } catch (e) {
      alert('Falha ao atualizar o status do documento.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">
          Documentos {tipo}
          {verObsoletos && <span className="ml-2 text-sm font-normal text-gray-400">(obsoletos)</span>}
        </h2>
        <div className="flex items-center gap-2">
          {/* Busca via GET, as-you-type */}
          <div className="relative">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar pelo nome…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500 w-56"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          </div>
          {/* Filtro ativos / obsoletos */}
          <button
            onClick={() => { setVerObsoletos((v) => !v); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              verObsoletos
                ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {verObsoletos ? '↩ Ver ativos' : '🗄 Ver obsoletos'}
          </button>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Cadastrar</button>
        </div>
      </div>

      {showForm && (
        <ModalDoc veiculo={veiculo} doc={editando} tipo={tipo} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-14">ID</th>
              <th className="px-3 py-2">Nome do documento</th>
              <th className="px-3 py-2 whitespace-nowrap">Dt Documento</th>
              <th className="px-3 py-2 whitespace-nowrap">Dt Validade</th>
              <th className="px-3 py-2 w-48">Status</th>
              <th className="px-3 py-2 text-center w-24">Obsoleto</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">
                {buscaDebounced ? `Nada encontrado para "${buscaDebounced}".`
                  : verObsoletos ? 'Nenhum documento obsoleto.'
                  : 'Nenhum documento cadastrado.'}
              </td></tr>
            ) : rows.map((d) => {
              const s = statusVencimento(d.diferenca_dias);
              return (
                <tr key={d.id} className={`hover:bg-gray-50 ${d.obsoleto ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 text-gray-500">#{d.id}</td>
                  <td className={`px-3 py-2 font-medium ${d.obsoleto ? 'line-through text-gray-500' : ''}`}>
                    {d.nome_documento || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtData(d.data_documento)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtData(d.data_validade)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[70px]">
                        <div className={`h-full rounded-full ${s.barra} transition-all`} style={{ width: `${s.percent}%` }} />
                      </div>
                      <span className={`text-[11px] font-medium whitespace-nowrap ${s.texto}`}>{s.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ToggleObsoleto
                      ligado={!!d.obsoleto}
                      carregando={togglingId === d.id}
                      onChange={() => toggleObsoleto(d)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    {d.tem_arquivo && (
                      <a href={route('admin.frota.anexos.view', [anexoTipo, d.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Abrir</a>
                    )}
                    <button onClick={() => abrirEdit(d)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(d)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação (10 por página) */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
        <span>
          {meta.total > 0
            ? `Mostrando ${meta.from}–${meta.to} de ${meta.total} registro(s)`
            : '—'}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={meta.current_page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-2">Página {meta.current_page} de {meta.last_page}</span>
          <button
            disabled={meta.current_page >= meta.last_page || loading}
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
}

/* Toggle switch de "obsoleto" (checkbox estilizado) */
function ToggleObsoleto({ ligado, carregando, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      disabled={carregando}
      onClick={onChange}
      title={ligado ? 'Documento obsoleto — clique para reativar' : 'Marcar como obsoleto'}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        ligado ? 'bg-indigo-600' : 'bg-gray-300'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        ligado ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

function ModalDoc({ veiculo, doc, tipo, onClose, onSaved }) {
  const editando = !!doc?.id;
  const isLegal = tipo === 'legais';
  const routePrefix = isLegal ? 'docs-legais' : 'docs-tecnicos';
  const subfolder = isLegal ? 'docs_legais' : 'docs_tecnicos';

  const { data, setData, post, processing, errors } = useForm({
    nome_documento: doc?.nome_documento ?? '',
    data_documento: doc?.data_documento?.substring(0, 10) ?? '',
    data_validade:  doc?.data_validade?.substring(0, 10) ?? '',
    status:         doc?.status ?? 'Ativo',
    arquivo:        null,
    _method:        editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route(`admin.frota.${routePrefix}.update`, doc.id)
      : route(`admin.frota.veiculos.${routePrefix}.store`, veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar documento #${doc.id}` : `Novo documento ${tipo}`} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3" encType="multipart/form-data">
        <F label="Nome do documento *" name="nome_documento" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Data do documento" name="data_documento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Data de validade" name="data_validade" type="date" data={data} setData={setData} errors={errors} />
        <FilePdfField
          label={`Arquivo PDF ${editando ? '(deixe vazio para manter o atual)' : '*'}`}
          subfolder={subfolder}
          setData={setData} errors={errors} veiculo={veiculo} className="md:col-span-2"
        />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* Campo de upload restrito a PDF, com zona de ARRASTAR-E-SOLTAR + clique.
   Valida PDF no cliente (tipo/extensão) e mostra o arquivo escolhido. */
/* Campo de upload com ARRASTAR-E-SOLTAR reutilizável (todas as abas).
 * onFile(file|null) é o callback; pdfOnly restringe a PDF (senão PDF+imagem);
 * compact = versão enxuta (ex.: linhas de NF); viewHref = link "Ver" (abre
 * inline em nova aba, sem download). */
function DropFileField({ label, hint, onFile, pdfOnly = false, viewHref = null, error = null, compact = false, className = '' }) {
  const inputRef = useRef(null);
  const [erro, setErro] = useState(null);
  const [nome, setNome] = useState(null);
  const [dragging, setDragging] = useState(false);

  const accept = pdfOnly ? 'application/pdf,.pdf' : 'application/pdf,image/*';
  const valido = (f) => pdfOnly
    ? (f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    : (f.type === 'application/pdf' || f.type.startsWith('image/') || /\.(pdf|jpe?g|png|webp)$/i.test(f.name));

  const aplicar = (f) => {
    setErro(null);
    if (!f) return;
    if (!valido(f)) {
      setErro(pdfOnly ? 'Apenas PDF.' : 'Apenas PDF ou imagem.');
      setNome(null); onFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setNome(f.name); onFile(f);
  };
  const limpar = (e) => { e.stopPropagation(); setNome(null); setErro(null); onFile(null); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>}
      <div
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); aplicar(e.dataTransfer.files?.[0] ?? null); }}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition text-center ${compact ? 'px-2 py-2' : 'px-4 py-6'} ${
          dragging ? 'border-rise-500 bg-rise-50' : nome ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-rise-400 hover:bg-rise-50/40'
        }`}
      >
        {nome ? (
          <>
            <span className={compact ? 'text-sm' : 'text-2xl'}>📄</span>
            <span className={`${compact ? 'text-[11px]' : 'text-sm'} font-medium text-gray-800 break-all`}>{nome}</span>
            <button type="button" onClick={limpar} className="text-[11px] text-red-600 hover:underline">Remover</button>
          </>
        ) : (
          <>
            {!compact && <span className="text-2xl">⬆️</span>}
            <span className={`${compact ? 'text-[11px]' : 'text-sm'} text-gray-700`}>
              <span className="font-semibold text-rise-700">{compact ? 'Arraste/clique' : 'Arraste aqui'}</span>{!compact && ' ou clique para escolher'}
            </span>
            {hint && !compact && <span className="text-xs text-gray-400">{hint}</span>}
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={(e) => aplicar(e.target.files?.[0] ?? null)} className="hidden" />
      {viewHref && !nome && (
        <a href={viewHref} target="_blank" rel="noreferrer" className="inline-block mt-1 text-[11px] text-purple-700 hover:underline">
          Ver arquivo atual
        </a>
      )}
      {(erro || error) && <p className="text-red-600 text-xs mt-1">{erro || error}</p>}
    </div>
  );
}

function FilePdfField({ label, subfolder, setData, errors, veiculo, className = '' }) {
  const inputRef = useRef(null);
  const [erroLocal, setErroLocal] = useState(null);
  const [arquivoNome, setArquivoNome] = useState(null);
  const [dragging, setDragging] = useState(false);

  const aplicarArquivo = (file) => {
    setErroLocal(null);
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setErroLocal('Apenas arquivos PDF são permitidos.');
      setArquivoNome(null);
      setData('arquivo', null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setArquivoNome(file.name);
    setData('arquivo', file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    aplicarArquivo(e.dataTransfer.files?.[0] ?? null);
  };

  const limpar = (e) => {
    e.stopPropagation();
    setArquivoNome(null);
    setErroLocal(null);
    setData('arquivo', null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition ${
          dragging
            ? 'border-rise-500 bg-rise-50'
            : arquivoNome
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-rise-400 hover:bg-rise-50/40'
        }`}
      >
        {arquivoNome ? (
          <>
            <span className="text-2xl">📄</span>
            <span className="text-sm font-medium text-gray-800 break-all">{arquivoNome}</span>
            <button type="button" onClick={limpar} className="text-xs text-red-600 hover:underline mt-0.5">Remover</button>
          </>
        ) : (
          <>
            <span className="text-2xl">⬆️</span>
            <span className="text-sm text-gray-700">
              <span className="font-semibold text-rise-700">Arraste o PDF aqui</span> ou clique para escolher
            </span>
            <span className="text-xs text-gray-400">Somente PDF (máx. 10 MB)</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => aplicarArquivo(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      <p className="text-xs text-gray-500 mt-1">
        Vai para o OneDrive em <code>veiculos/{veiculo.id}/{subfolder}/</code>
      </p>
      {(erroLocal || errors?.arquivo) && <p className="text-red-600 text-xs mt-1">{erroLocal || errors.arquivo}</p>}
    </div>
  );
}

/* ============ Helpers de Modal ============ */
function ModalShell({ title, onClose, children, large = false, wide = false }) {
  const largura = wide ? 'max-w-6xl' : large ? 'max-w-4xl' : 'max-w-2xl';
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${largura} my-4`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, processing, editando }) {
  return (
    <div className="md:col-span-3 flex justify-end gap-2 border-t pt-4 mt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
      <button type="submit" disabled={processing}
              className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
        {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
      </button>
    </div>
  );
}

// Mantém a assinatura antiga (manutenção usa 'arquivo', IPVA usa 'anexo'),
// mas agora com arrastar-e-soltar via DropFileField.
function FileFieldOneDrive({ label, subfolder, setData, errors, veiculo, className = '' }) {
  return (
    <DropFileField
      label={label}
      hint={`PDF ou imagem — vai para veiculos/${veiculo.id}/${subfolder}/`}
      pdfOnly={false}
      onFile={(f) => { setData('arquivo', f); setData('anexo', f); }}
      error={errors?.arquivo || errors?.anexo}
      className={className}
    />
  );
}

/* ============ TAB: Corretivas ============
 * Auto-suficiente (mesmo padrão dos docs): busca a listagem via GET paginado
 * com pesquisa as-you-type por fornecedor / tipo / descrição. */
function TabCorretivas({ veiculo, fornecedores = [], obras = [], funcionarios = [] }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [verManutencao, setVerManutencao] = useState(null); // detalhes (read-only)

  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setBuscaDebounced(busca); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const url = route('admin.frota.veiculos.manutencoes.list', {
        veiculo: veiculo.id, q: buscaDebounced || undefined, page,
      });
      const { data } = await window.axios.get(url);
      setRows(data.data || []);
      setMeta(data.meta || { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
    } catch (e) {
      console.error('[TabCorretivas] falha ao carregar', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [veiculo.id, buscaDebounced, page]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (m) => { setEditando(m); setShowForm(true); };
  const onSaved = () => { setShowForm(false); carregar(); };
  const excluir = (m) => {
    if (!confirm('Remover esta manutenção?')) return;
    router.delete(route('admin.frota.manutencoes.destroy', m.id), {
      preserveScroll: true, onSuccess: carregar,
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Manutenções corretivas</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar fornecedor / tipo…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500 w-60"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          </div>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Nova manutenção</button>
        </div>
      </div>

      {showForm && (
        <ModalCorretiva veiculo={veiculo} manutencao={editando} fornecedores={fornecedores} obras={obras} funcionarios={funcionarios} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}

      {verManutencao && (
        <ModalVerCorretiva veiculo={veiculo} manutencao={verManutencao} onClose={() => setVerManutencao(null)} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">{veiculo.tipo_hr ? 'Hr' : 'Km'}</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">Início</th>
              <th className="px-3 py-2">Conclusão</th>
              <th className="px-3 py-2">Garantia</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-500 py-6">
                {buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhuma manutenção registrada.'}
              </td></tr>
            ) : rows.map((m) => {
              const s = situacaoCorretiva[m.situacao] ?? { label: '—', cor: 'bg-gray-200 text-gray-700' };
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">#{m.id}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${s.cor}`}>{s.label}</span></td>
                  <td className="px-3 py-2">{veiculo.tipo_hr ? m.horimetro_atual : m.quilometragem_atual}</td>
                  <td className="px-3 py-2 text-xs">{m.fornecedor?.nome_fantasia ?? '—'}</td>
                  <td className="px-3 py-2">{fmtData(m.data_de_execucao)}</td>
                  <td className="px-3 py-2">{fmtData(m.data_conclusao)}</td>
                  <td className="px-3 py-2">{fmtData(m.data_de_vencimento)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(m.valor_do_servico)}</td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => setVerManutencao(m)} title="Ver detalhes e arquivos" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Ver</button>
                    <button onClick={() => abrirEdit(m)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(m)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação (10 por página) */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
        <span>{meta.total > 0 ? `Mostrando ${meta.from}–${meta.to} de ${meta.total} registro(s)` : '—'}</span>
        <div className="flex items-center gap-1">
          <button disabled={meta.current_page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Anterior</button>
          <span className="px-2">Página {meta.current_page} de {meta.last_page}</span>
          <button disabled={meta.current_page >= meta.last_page || loading} onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Próximo</button>
        </div>
      </div>
    </div>
  );
}

/* Lista consolidada de anexos de um registro (anexo geral + PDFs das NFs).
   `arquivos` = [{ label, href }]. Abre inline em nova aba, nunca baixa. */
function ListaArquivos({ arquivos }) {
  if (!arquivos || arquivos.length === 0) {
    return <p className="text-sm text-gray-400 bg-gray-50 border rounded p-3">Nenhum arquivo anexado.</p>;
  }
  return (
    <ul className="divide-y border rounded-lg overflow-hidden">
      {arquivos.map((a, i) => (
        <li key={i} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 gap-3">
          <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
            <span className="text-purple-600 shrink-0">📎</span>
            <span className="truncate">{a.label}</span>
          </span>
          <a href={a.href} target="_blank" rel="noreferrer"
             className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">
            Abrir
          </a>
        </li>
      ))}
    </ul>
  );
}

/* Reúne os anexos de uma manutenção/OS: anexo geral + cada NF com PDF.
   `tipo` = 'manutencao' | 'os-preventiva'; `notaRoute` = rota do PDF da NF. */
function montarArquivos(reg, tipo, notaRoute) {
  const arquivos = [];
  if (reg.tem_arquivo) {
    arquivos.push({ label: 'Comprovante / anexo geral', href: route('admin.frota.anexos.view', [tipo, reg.id]) });
  }
  (reg.notas_fiscais || []).forEach((n, i) => {
    if (n?.arquivo) {
      arquivos.push({ label: `NF ${n.numero || (i + 1)}`, href: route(notaRoute, [reg.id, n.idx ?? i]) });
    }
  });
  return arquivos;
}

/* ============ Modal: Ver Manutenção Corretiva (somente leitura + arquivos) ============ */
function ModalVerCorretiva({ manutencao, onClose }) {
  const m = manutencao;
  const sit = situacaoCorretiva[m.situacao] ?? { label: '—', cor: 'bg-gray-200 text-gray-700' };
  const arquivos = montarArquivos(m, 'manutencao', 'admin.frota.manutencoes.nota-arquivo');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-base font-bold">Manutenção corretiva #{m.id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </header>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Info label="Situação" value={<span className={`px-2 py-0.5 rounded text-xs ${sit.cor}`}>{sit.label}</span>} />
            <Info label="Tipo" value={m.tipo || '—'} />
            <Info label="Fornecedor" value={m.fornecedor?.nome_fantasia ?? '—'} />
            <Info label="Execução" value={fmtData(m.data_de_execucao)} />
            <Info label="Conclusão" value={fmtData(m.data_conclusao)} />
            <Info label="Garantia" value={fmtData(m.data_de_vencimento)} />
            <Info label="Valor total" value={fmtMoney(m.valor_do_servico)} />
          </div>

          {(m.notas_fiscais || []).length > 0 && (
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Notas fiscais</p>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr><th className="px-3 py-1.5">Núm. NF / NFSE</th><th className="px-3 py-1.5 w-28">Data</th><th className="px-3 py-1.5 w-32 text-right">Valor</th><th className="px-3 py-1.5 w-24">PDF</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {m.notas_fiscais.map((n, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-gray-800">{n.numero || '—'}</td>
                        <td className="px-3 py-2">{fmtData(n.data)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(n.valor)}</td>
                        <td className="px-3 py-2">
                          {n.arquivo
                            ? <a href={route('admin.frota.manutencoes.nota-arquivo', [m.id, i])} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">Abrir</a>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {m.descricao && (
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Descrição</p>
              <p className="text-sm bg-gray-50 border rounded p-2 whitespace-pre-wrap">{m.descricao}</p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase text-gray-500 mb-1">Arquivos anexados</p>
            <ListaArquivos arquivos={arquivos} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Combobox com busca (autocomplete) — melhor que <select> para listas
   grandes (ex.: milhares de funcionários). Guarda o id; filtra por rótulo. */
function AutocompleteSelect({ value, onChange, options, placeholder = '— selecione —' }) {
  const selected = options.find((o) => String(o.id) === String(value));
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  // Reflete o valor externo (ex.: ao abrir a edição)
  useEffect(() => { setQuery(selected?.label ?? ''); /* eslint-disable-next-line */ }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (!q ? options : options.filter((o) => o.label.toLowerCase().includes(q))).slice(0, 50);
  const pick = (o) => { onChange(String(o.id)); setQuery(o.label); setOpen(false); };

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); if (e.target.value === '') onChange(''); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(filtered.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === 'Enter' && open && filtered[hi]) { e.preventDefault(); pick(filtered[hi]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className={`${inputCls} pr-8`}
      />
      {value && (
        <button type="button" tabIndex={-1} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
      )}
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">Nada encontrado</li>
          ) : filtered.map((o, i) => (
            <li key={o.id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHi(i)}
                className={`block w-full text-left px-3 py-1.5 ${i === hi ? 'bg-rise-50 text-rise-800' : 'hover:bg-gray-50'}`}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SecaoForm({ titulo, children }) {
  return (
    <div className="md:col-span-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-rise-700 border-b border-gray-200 pb-1 mb-3">{titulo}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function ModalCorretiva({ veiculo, manutencao, fornecedores, obras = [], funcionarios = [], onClose, onSaved }) {
  const editando = !!manutencao?.id;
  const { data, setData, post, processing, errors } = useForm({
    situacao:              manutencao?.situacao ?? 1,
    tipo:                  manutencao?.tipo ?? '',
    fornecedor_id:         manutencao?.fornecedor_id ?? '',
    id_obra:               manutencao?.id_obra ?? '',
    id_usuario:            manutencao?.id_usuario ?? '',
    quilometragem_atual:   manutencao?.quilometragem_atual ?? '',
    quilometragem_nova:    manutencao?.quilometragem_nova ?? '',
    horimetro_atual:       manutencao?.horimetro_atual ?? '',
    horimetro_proximo:     manutencao?.horimetro_proximo ?? '',
    data_de_execucao:      manutencao?.data_de_execucao?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    data_previsao_termino: manutencao?.data_previsao_termino?.substring(0, 10) ?? '',
    data_conclusao:        manutencao?.data_conclusao?.substring(0, 10) ?? '',
    data_de_vencimento:    manutencao?.data_de_vencimento?.substring(0, 10) ?? '',
    // Lista de NFs. Cada linha: número, data, valor, arquivo (PDF já enviado)
    // e arquivo_novo (PDF sendo anexado agora — viaja junto da linha).
    notas_fiscais: (manutencao?.notas_fiscais?.length
      ? manutencao.notas_fiscais.map((n) => ({ numero: n.numero ?? '', data: (n.data ?? '').substring(0, 10), valor: n.valor ?? '', arquivo: n.arquivo ?? null, arquivo_novo: null }))
      : [{ numero: '', data: '', valor: '', arquivo: null, arquivo_novo: null }]),
    descricao:             manutencao?.descricao ?? '',
    arquivo:               null,
    _method:               editando ? 'put' : 'post',
  });

  const totalNotas = (data.notas_fiscais || []).reduce((acc, n) => acc + (Number(n.valor) || 0), 0);

  const linhaVazia = { numero: '', data: '', valor: '', arquivo: null, arquivo_novo: null };
  const addNota = () => setData('notas_fiscais', [...data.notas_fiscais, { ...linhaVazia }]);
  const removeNota = (idx) => setData('notas_fiscais',
    data.notas_fiscais.length > 1 ? data.notas_fiscais.filter((_, i) => i !== idx) : data.notas_fiscais);
  const setNota = (idx, campo, valor) => setData('notas_fiscais',
    data.notas_fiscais.map((n, i) => (i === idx ? { ...n, [campo]: valor } : n)));

  // Opções dos autocompletes (id + rótulo)
  const optFornecedores = useMemo(() => fornecedores.map((f) => ({ id: f.id, label: f.nome_fantasia })), [fornecedores]);
  const optObras = useMemo(() => obras.map((o) => ({ id: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);
  const optFuncionarios = useMemo(() => funcionarios.map((u) => ({ id: u.id, label: u.nome })), [funcionarios]);

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.manutencoes.update', manutencao.id)
      : route('admin.frota.veiculos.manutencoes.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar manutenção #${manutencao.id}` : 'Nova manutenção corretiva'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4" encType="multipart/form-data">

        <SecaoForm titulo="Identificação">
          <F label="Situação *" name="situacao" errors={errors}>
            <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)} className={inputCls}>
              <option value="1">Pendente</option>
              <option value="2">Em Execução</option>
              <option value="3">Concluído</option>
              <option value="4">Cancelado</option>
            </select>
          </F>
          <F label="Tipo de serviço" name="tipo" data={data} setData={setData} errors={errors} />
          <F label="Fornecedor" name="fornecedor_id" errors={errors}>
            <AutocompleteSelect value={data.fornecedor_id} onChange={(v) => setData('fornecedor_id', v)} options={optFornecedores} placeholder="Buscar fornecedor…" />
          </F>
          <F label="Obra" name="id_obra" errors={errors}>
            <AutocompleteSelect value={data.id_obra} onChange={(v) => setData('id_obra', v)} options={optObras} placeholder="Buscar obra…" />
          </F>
          <F label="Responsável" name="id_usuario" errors={errors}>
            <AutocompleteSelect value={data.id_usuario} onChange={(v) => setData('id_usuario', v)} options={optFuncionarios} placeholder="Buscar responsável…" />
          </F>
        </SecaoForm>

        <SecaoForm titulo={veiculo.tipo_hr ? 'Horímetro' : 'Quilometragem'}>
          {veiculo.tipo_hr ? (
            <>
              <F label="Horímetro atual" name="horimetro_atual" type="number" data={data} setData={setData} errors={errors} />
              <F label="Horímetro próximo" name="horimetro_proximo" type="number" data={data} setData={setData} errors={errors} />
            </>
          ) : (
            <>
              <F label="Km atual" name="quilometragem_atual" type="number" data={data} setData={setData} errors={errors} />
              <F label="Km próximo" name="quilometragem_nova" type="number" data={data} setData={setData} errors={errors} />
            </>
          )}
        </SecaoForm>

        <SecaoForm titulo="Datas">
          <F label="Data de execução" name="data_de_execucao" type="date" data={data} setData={setData} errors={errors} />
          <F label="Previsão de término" name="data_previsao_termino" type="date" data={data} setData={setData} errors={errors} />
          <F label="Data de conclusão" name="data_conclusao" type="date" data={data} setData={setData} errors={errors} />
          <F label="Garantia (vencimento)" name="data_de_vencimento" type="date" data={data} setData={setData} errors={errors} />
        </SecaoForm>

        {/* Notas fiscais — lista repetível com Adicionar/Remover + total */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rise-700">Notas fiscais</p>
            <div className="flex gap-2">
              <button type="button" onClick={addNota}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#557bbb] text-white hover:bg-[#3a5a8c]">
                Adicionar NF
              </button>
              <button type="button" onClick={() => removeNota(data.notas_fiscais.length - 1)}
                disabled={data.notas_fiscais.length <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                Remover NF
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {data.notas_fiscais.map((n, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_0.9fr_1.3fr_auto] gap-2 items-end">
                <div>
                  {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Núm. NF / NFSE</label>}
                  <input value={n.numero} onChange={(e) => setNota(idx, 'numero', e.target.value)} className={inputCls} />
                </div>
                <div>
                  {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Data NF</label>}
                  <input type="date" value={n.data} onChange={(e) => setNota(idx, 'data', e.target.value)} className={inputCls} />
                </div>
                <div>
                  {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Valor (R$)</label>}
                  <input type="number" step="0.01" min="0" value={n.valor} onChange={(e) => setNota(idx, 'valor', e.target.value)} className={inputCls} />
                </div>
                <div>
                  {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Arquivo PDF</label>}
                  <DropFileField compact pdfOnly
                    onFile={(f) => setNota(idx, 'arquivo_novo', f)}
                    viewHref={editando && n.arquivo ? route('admin.frota.manutencoes.nota-arquivo', [manutencao.id, idx]) : null} />
                </div>
                <button type="button" onClick={() => removeNota(idx)} disabled={data.notas_fiscais.length <= 1}
                  title="Remover esta NF"
                  className="h-[38px] px-3 flex items-center justify-center rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-30">
                  Remover
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-3">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase text-gray-500">Total das Notas Fiscais</p>
              <div className="mt-1 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">{fmtMoney(totalNotas)}</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Descrição</label>
          <textarea rows={3} value={data.descricao} onChange={(e) => setData('descricao', e.target.value)} className={inputCls} />
        </div>

        <FileFieldOneDrive label="Anexo (NF, comprovante)" subfolder={`manutencoes/${manutencao?.id ?? 'novo'}`} setData={setData} errors={errors} veiculo={veiculo} className="md:col-span-3" />

        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Preventivas (Dashboard de Ciclos + Histórico) ============ */
function TabPreventivas({ dashboard, veiculo, registros, fornecedores = [], obras = [], funcionarios = [] }) {
  const [cicloParaOs, setCicloParaOs] = useState(null); // create
  const [osEditar, setOsEditar] = useState(null);        // edit (id)
  const [osVer, setOsVer] = useState(null);              // view (id)
  const [refreshKey, setRefreshKey] = useState(0);

  // Após criar/editar/excluir/mudar status: recarrega histórico + pendências
  // (self-fetch) e o dashboard de ciclos (prop do servidor, via partial reload).
  const aoSalvar = () => {
    setRefreshKey((k) => k + 1);
    router.reload({ only: ['dashboard_ciclos'], preserveScroll: true });
  };

  const excluirOs = (id) => {
    if (!confirm('Remover esta OS preventiva? O checklist dela também será removido.')) return;
    router.delete(route('admin.frota.os-preventiva.destroy', id), { preserveScroll: true, onSuccess: aoSalvar });
  };
  const mudarStatus = (id, situacao) => {
    window.axios.patch(route('admin.frota.os-preventiva.status', id), { situacao })
      .then(aoSalvar)
      .catch((e) => console.error('[status OS]', e));
  };

  if (!dashboard || dashboard.ciclos.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Dashboard de Preventivas (Ciclos)</h2>
        <p className="text-gray-500 text-sm bg-amber-50 border border-amber-200 p-3 rounded">
          Este veículo ainda não tem itens de preventiva cadastrados. Cadastre os ciclos no plano de preventiva para ver o dashboard.
        </p>
        {registros.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Planos cadastrados</h3>
            <ul className="list-disc pl-5 text-sm">
              {registros.map((p) => <li key={p.id}>{p.nome_preventiva}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const { medicao_atual, unidade, ciclos } = dashboard;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold uppercase text-gray-600">
          <span className="mr-2">⚠</span> Dashboard de Preventivas (Ciclos)
        </h2>
        <span className="text-sm text-gray-500">
          Medição atual: <strong>{Number(medicao_atual).toLocaleString('pt-BR')} {unidade}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {ciclos.map((c) => (
          <CicloCard
            key={c.periodo}
            ciclo={c}
            unidade={unidade}
            medicaoAtual={medicao_atual}
            onCadastrar={() => setCicloParaOs(c)}
          />
        ))}
      </div>

      {cicloParaOs && (
        <ModalOsPreventiva
          mode="create"
          veiculo={veiculo}
          ciclo={cicloParaOs}
          medicaoAtual={medicao_atual}
          unidade={unidade}
          fornecedores={fornecedores}
          obras={obras}
          funcionarios={funcionarios}
          onClose={() => setCicloParaOs(null)}
          onSaved={aoSalvar}
        />
      )}

      {osEditar && (
        <ModalOsPreventiva
          mode="edit"
          veiculo={veiculo}
          osId={osEditar}
          medicaoAtual={medicao_atual}
          unidade={unidade}
          fornecedores={fornecedores}
          obras={obras}
          funcionarios={funcionarios}
          onClose={() => setOsEditar(null)}
          onSaved={aoSalvar}
        />
      )}

      {osVer && <ModalVerOs osId={osVer} unidade={unidade} tipoHr={veiculo.tipo_hr} onClose={() => setOsVer(null)} />}

      <PendenciasPreventivas veiculo={veiculo} unidade={unidade} refreshKey={refreshKey} />

      <HistoricoPreventivas
        veiculo={veiculo}
        unidade={unidade}
        refreshKey={refreshKey}
        onVer={setOsVer}
        onEditar={setOsEditar}
        onExcluir={excluirOs}
        onStatus={mudarStatus}
      />
    </div>
  );
}

/* Histórico de OS preventivas — self-fetch paginado + busca (padrão das
   demais abas). O dashboard de ciclos acima continua vindo do show(). */
function HistoricoPreventivas({ veiculo, unidade, refreshKey, onVer, onEditar, onExcluir, onStatus }) {
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.servicos-preventiva.list', veiculo.id);

  // Recarrega quando uma OS é criada/editada/excluída/muda status na aba.
  useEffect(() => { if (refreshKey) reload(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white border rounded-lg mt-6">
      <div className="border-b px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">📜 Histórico de OS Preventivas</h3>
        <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar responsável / plano…" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Ciclo</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2 text-right">Atual</th>
              <th className="px-3 py-2 text-right">Próxima</th>
              <th className="px-3 py-2">Início</th>
              <th className="px-3 py-2">Conclusão</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={11} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhuma OS preventiva executada.'}</td></tr>
            ) : rows.map((h) => {
              const cicloLabel = veiculo.tipo_hr ? h.campo_cal_hr : h.campo_calc_km;
              const atual = veiculo.tipo_hr ? h.horimetro_atual : h.quilometragem_atual;
              const prox  = veiculo.tipo_hr ? h.horimetro_proximo : h.quilometragem_nova;
              return (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">#{h.id}</td>
                  <td className="px-3 py-2 font-medium">{cicloLabel ? `${fmtNum(cicloLabel)} ${unidade}` : '—'}</td>
                  <td className="px-3 py-2">{h.motorista?.nome ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(atual)} {unidade}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(prox)} {unidade}</td>
                  <td className="px-3 py-2">{fmtData(h.data_de_execucao)}</td>
                  <td className="px-3 py-2">{fmtData(h.data_conclusao)}</td>
                  <td className="px-3 py-2">{fmtData(h.data_de_vencimento)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={Number(h.status_realizado) || ''}
                      onChange={(e) => onStatus(h.id, Number(e.target.value))}
                      className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-rise-500"
                    >
                      <option value={1}>Pendente</option>
                      <option value={2}>Em Execução</option>
                      <option value={3}>Concluído</option>
                      <option value={4}>Cancelado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(h.total_valor_servico)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                    <button onClick={() => onVer(h.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Ver</button>
                    <button onClick={() => onEditar(h.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => onExcluir(h.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3">
        <Paginacao meta={meta} loading={loading} onPage={setPage} />
      </div>
    </div>
  );
}

/* Backlog de manutenção diferida: itens cujo último checklist ficou "Não". */
function PendenciasPreventivas({ veiculo, unidade, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await window.axios.get(route('admin.frota.veiculos.pendencias-preventiva.list', veiculo.id));
      setRows(data.data || []);
    } catch (e) { console.error('[pendencias]', e); setRows([]); }
    finally { setLoading(false); }
  }, [veiculo.id]);

  useEffect(() => { carregar(); }, [carregar, refreshKey]);

  if (loading && rows.length === 0) return null;
  if (rows.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg mt-6">
      <div className="border-b border-amber-200 px-4 py-3 flex items-center gap-2">
        <h3 className="font-semibold text-amber-800">⚠ Manutenção diferida (pendências)</h3>
        <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-semibold">{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-amber-100/60 text-left text-amber-900">
            <tr>
              <th className="px-3 py-2">Serviço</th>
              <th className="px-3 py-2">Ciclo</th>
              <th className="px-3 py-2">Pendente desde</th>
              <th className="px-3 py-2">OS origem</th>
              <th className="px-3 py-2">Justificativa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-200">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 font-medium text-gray-800">{p.nome_servico || '—'}</td>
                <td className="px-3 py-2">{p.periodo ? `${fmtNum(p.periodo)} ${unidade}` : '—'}</td>
                <td className="px-3 py-2">{fmtData(p.data)}</td>
                <td className="px-3 py-2 text-gray-500">#{p.os_id}</td>
                <td className="px-3 py-2 text-gray-700">{p.observacao || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CicloCard({ ciclo, unidade, medicaoAtual, onCadastrar }) {
  const { periodo, alvo, distancia, progresso, data_ultima, data_vencimento, estado, bloqueio, qtd_itens, vencido } = ciclo;

  const palette = {
    mestre:              { borda: 'border-rise-500 ring-2 ring-rise-300', barra: 'bg-rise-500', titulo: 'text-rise-700', icone: '✅' },
    bloqueado_por_maior: { borda: 'border-gray-300', barra: 'bg-gray-300', titulo: 'text-gray-500', icone: '🔒' },
    vencido:             { borda: 'border-red-500', barra: 'bg-red-500', titulo: 'text-red-600', icone: '⚠' },
    aguardando:          { borda: 'border-blue-300', barra: 'bg-blue-400', titulo: 'text-blue-700', icone: '🔧' },
  };
  const p = palette[estado] ?? palette.aguardando;

  return (
    <div className={`bg-white border-t-[3px] ${p.borda} rounded-lg shadow-sm border-x border-b p-2.5 flex flex-col`}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold">Ciclo {fmtNum(periodo)} {unidade}</p>
          <p className={`text-sm font-bold ${p.titulo}`}>
            {estado === 'vencido' && 'Vencido'}
            {estado === 'mestre' && (vencido ? 'Executar agora' : 'Próximo!')}
            {estado === 'bloqueado_por_maior' && 'Aguarda OS maior'}
            {estado === 'aguardando' && (
              <>
                {fmtNum(distancia)} <span className="text-xs text-gray-500 font-normal">{unidade} faltantes</span>
              </>
            )}
          </p>
          {vencido && estado !== 'vencido' && (
            <span className="inline-block mt-0.5 text-xs font-semibold text-red-600">⚠ vencido</span>
          )}
        </div>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${vencido ? 'bg-red-500' : p.barra} bg-opacity-20`}>{vencido ? '⚠' : p.icone}</span>
      </div>

      <div className="my-1">
        <div className="h-1.5 bg-gray-100 rounded">
          <div className={`h-1.5 ${p.barra} rounded ${estado === 'mestre' ? 'animate-pulse' : ''}`} style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-0.5">
          <span>Atual: {fmtNum(medicaoAtual)}</span>
          <span>Target: {fmtNum(alvo)}</span>
        </div>
      </div>

      <div className="border-t pt-1 text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Última Exec:</span>
          <span className="font-medium">{data_ultima ? fmtData(data_ultima) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Prev. Data:</span>
          <span className="font-medium">{data_vencimento ? fmtData(data_vencimento) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Itens no ciclo:</span>
          <span className="font-medium">{qtd_itens}</span>
        </div>
      </div>

      <div className="mt-2">
        {estado === 'mestre' ? (
          <button
            onClick={onCadastrar}
            className="w-full bg-rise-600 text-white py-1.5 rounded text-sm font-semibold hover:bg-rise-700 animate-pulse"
          >
            Cadastrar OS
          </button>
        ) : (
          <div className="space-y-1">
            {bloqueio && <p className="text-xs text-gray-500 text-center leading-tight">{bloqueio}</p>}
            <button
              onClick={() => {
                if (estado === 'aguardando' &&
                    !confirm(`Este ciclo ainda não venceu (${(bloqueio || 'em dia').toLowerCase()}). Deseja antecipar a OS assim mesmo?`)) return;
                onCadastrar();
              }}
              className="w-full border border-rise-300 text-rise-700 py-1.5 rounded text-xs font-medium hover:bg-rise-50"
            >
              {estado === 'aguardando' ? 'Antecipar OS'
                : estado === 'bloqueado_por_maior' ? 'Cadastrar só este'
                : 'Cadastrar OS'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ TAB: Seguros ============ */
function TabSeguros({ veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.seguros.list', veiculo.id);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (s) => { setEditando(s); setShowForm(true); };
  const onSaved = () => { setShowForm(false); reload(); };
  const excluir = (s) => {
    if (!confirm('Remover este seguro?')) return;
    router.delete(route('admin.frota.seguros.destroy', s.id), { preserveScroll: true, onSuccess: reload });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Seguros</h2>
        <div className="flex items-center gap-2">
          <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar seguradora…" />
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo seguro</button>
        </div>
      </div>

      {showForm && (
        <ModalSeguro veiculo={veiculo} seguro={editando} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Seguradora</th>
              <th className="px-3 py-2 text-right">Custo</th>
              <th className="px-3 py-2">Carência Inicial</th>
              <th className="px-3 py-2">Carência Final</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhum seguro cadastrado.'}</td></tr>
            ) : rows.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{s.id}</td>
                <td className="px-3 py-2 font-medium">{s.nome_seguradora || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(s.valor)}</td>
                <td className="px-3 py-2">{fmtData(s.carencia_inicial)}</td>
                <td className="px-3 py-2">{fmtData(s.carencia_final)}</td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  {s.tem_arquivo && (
                    <a href={route('admin.frota.anexos.view', ['seguro', s.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Apólice</a>
                  )}
                  <button onClick={() => abrirEdit(s)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(s)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />
    </div>
  );
}

function ModalSeguro({ veiculo, seguro, onClose, onSaved }) {
  const editando = !!seguro?.id;
  const { data, setData, post, processing, errors } = useForm({
    nome_seguradora:  seguro?.nome_seguradora ?? '',
    valor:            seguro?.valor ?? '',
    carencia_inicial: seguro?.carencia_inicial?.substring(0, 10) ?? '',
    carencia_final:   seguro?.carencia_final?.substring(0, 10) ?? '',
    arquivo:          null,
    _method:          editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.seguros.update', seguro.id)
      : route('admin.frota.veiculos.seguros.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar seguro #${seguro.id}` : 'Novo seguro'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3" encType="multipart/form-data">
        <F label="Seguradora *" name="nome_seguradora" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Valor (R$)" name="valor" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <div></div>
        <F label="Carência inicial" name="carencia_inicial" type="date" data={data} setData={setData} errors={errors} />
        <F label="Carência final" name="carencia_final" type="date" data={data} setData={setData} errors={errors} />
        <DropFileField
          label={`Apólice (PDF ou imagem)${editando ? ' — deixe vazio para manter' : ''}`}
          hint={`Vai para veiculos/${veiculo.id}/seguros/`}
          onFile={(f) => setData('arquivo', f)}
          viewHref={editando && seguro.tem_arquivo ? route('admin.frota.anexos.view', ['seguro', seguro.id]) : null}
          error={errors.arquivo}
          className="md:col-span-2"
        />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: IPVAs ============ */
function TabIpvas({ veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.ipvas.list', veiculo.id);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (i) => { setEditando(i); setShowForm(true); };
  const onSaved = () => { setShowForm(false); reload(); };
  const excluir = (i) => {
    if (!confirm('Remover este IPVA?')) return;
    router.delete(route('admin.frota.ipvas.destroy', i.id), { preserveScroll: true, onSuccess: reload });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">IPVAs</h2>
        <div className="flex items-center gap-2">
          <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar ano…" />
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo IPVA</button>
        </div>
      </div>

      {showForm && (
        <ModalIpva veiculo={veiculo} ipva={editando} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Ano</th>
              <th className="px-3 py-2 text-right">Custo</th>
              <th className="px-3 py-2">Pagamento</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Anexo</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhum IPVA cadastrado.'}</td></tr>
            ) : rows.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{i.id}</td>
                <td className="px-3 py-2 font-medium">{i.referencia_ano || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(i.valor)}</td>
                <td className="px-3 py-2">{fmtData(i.data_de_pagamento)}</td>
                <td className="px-3 py-2">{fmtData(i.data_de_vencimento)}</td>
                <td className="px-3 py-2 text-xs">
                  {i.tem_anexo
                    ? <a href={route('admin.frota.anexos.view', ['ipva', i.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Abrir</a>
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => abrirEdit(i)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(i)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />
    </div>
  );
}

function ModalIpva({ veiculo, ipva, onClose, onSaved }) {
  const editando = !!ipva?.id;
  const { data, setData, post, processing, errors } = useForm({
    referencia_ano:     ipva?.referencia_ano ?? new Date().getFullYear().toString(),
    valor:              ipva?.valor ?? '',
    data_de_pagamento:  ipva?.data_de_pagamento?.substring(0, 10) ?? '',
    data_de_vencimento: ipva?.data_de_vencimento?.substring(0, 10) ?? '',
    anexo:              null,
    _method:            editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.ipvas.update', ipva.id)
      : route('admin.frota.veiculos.ipvas.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar IPVA #${ipva.id}` : 'Novo IPVA'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3" encType="multipart/form-data">
        <F label="Ano de referência *" name="referencia_ano" data={data} setData={setData} errors={errors} />
        <F label="Valor (R$)" name="valor" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <F label="Data de pagamento" name="data_de_pagamento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Data de vencimento" name="data_de_vencimento" type="date" data={data} setData={setData} errors={errors} />
        <FileFieldOneDrive label="Anexo (NF/comprovante)" subfolder={`ipvas/${ipva?.id ?? 'novo'}`} setData={setData} errors={errors} veiculo={veiculo} className="md:col-span-2" />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Depreciação ============ */
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

const METODOS_DEP = [
  { value: '', label: '— automático —' },
  { value: 'horimetro', label: 'Por horímetro (linha amarela)' },
  { value: 'linear', label: 'Linear (cota constante)' },
  { value: 'saldo_decrescente', label: 'Saldo decrescente (acelerado)' },
  { value: 'mercado', label: 'Valor de mercado / FIPE' },
];
const METODO_LABEL = { horimetro: 'Horímetro', linear: 'Linear', saldo_decrescente: 'Saldo decr.', mercado: 'Mercado', manual: 'Manual' };

function TabDepreciacao({ veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [est, setEst] = useState(null);
  const [showMemoria, setShowMemoria] = useState(false);
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.depreciacoes.list', veiculo.id);

  const carregarEstimativa = useCallback(async () => {
    try {
      const { data } = await window.axios.get(route('admin.frota.veiculos.depreciacao.estimativa', veiculo.id));
      setEst(data);
    } catch (e) { console.error('[estimativa depreciacao]', e); }
  }, [veiculo.id]);
  useEffect(() => { carregarEstimativa(); }, [carregarEstimativa]);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (d) => { setEditando(d); setShowForm(true); };
  const onSaved = () => { setShowForm(false); reload(); carregarEstimativa(); };
  const excluir = (d) => {
    if (!confirm('Remover este registro de depreciação?')) return;
    router.delete(route('admin.frota.depreciacoes.destroy', d.id), { preserveScroll: true, onSuccess: () => { reload(); carregarEstimativa(); } });
  };
  const recalcular = () => {
    router.post(route('admin.frota.veiculos.depreciacao.recalcular', veiculo.id), {}, {
      preserveScroll: true, onSuccess: () => { reload(); carregarEstimativa(); },
    });
  };

  const e = est?.estimativa;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Depreciação</h2>
        <div className="flex items-center gap-2">
          <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar mês/ano…" />
          <button onClick={recalcular} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">↻ Recalcular mês</button>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Lançamento manual</button>
        </div>
      </div>

      {/* Estimativa ao vivo + parâmetros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4 lg:col-span-1">
          <p className="text-xs uppercase text-gray-500">Valor atual estimado</p>
          {e?.ok ? (
            <>
              <p className="text-2xl font-bold mt-1">{fmtMoney(e.valor_atual)}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 mr-2">{METODO_LABEL[e.metodo] ?? e.metodo}</span>
                {e.percentual_depreciado}% depreciado
              </p>
              <p className="text-xs text-gray-500 mt-1">Base {fmtMoney(e.valor_base)} · residual {fmtMoney(e.valor_residual)} · acum. {fmtMoney(e.depreciacao_acumulada)}</p>
              {e.aviso && <p className="text-xs text-amber-600 mt-1">⚠ {e.aviso}</p>}
              <button onClick={() => setShowMemoria((v) => !v)} className="text-xs text-indigo-600 hover:underline mt-2">{showMemoria ? 'ocultar' : 'ver'} memória de cálculo</button>
              {showMemoria && (
                <pre className="text-[11px] bg-gray-50 border rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(e.memoria, null, 2)}</pre>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-2">{e?.aviso ?? 'Preencha os parâmetros para estimar.'}</p>
          )}
        </div>

        {est && <ParametrosDepreciacao veiculo={veiculo} parametros={est.parametros} onSaved={carregarEstimativa} />}
      </div>

      {showForm && (
        <ModalDepreciacao veiculo={veiculo} depreciacao={editando} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Mês/Ano</th>
              <th className="px-3 py-2 text-right">Valor atual</th>
              <th className="px-3 py-2 text-right">Dep. acumulada</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Origem</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhuma depreciação registrada.'}</td></tr>
            ) : rows.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{capitalize(d.referencia_mes)}/{d.referencia_ano || '—'}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtMoney(d.valor_atual)}</td>
                <td className="px-3 py-2 text-right text-gray-600">{d.depreciacao_acumulada != null ? fmtMoney(d.depreciacao_acumulada) : '—'}</td>
                <td className="px-3 py-2">{METODO_LABEL[d.metodo] ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${d.origem === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{d.origem === 'manual' ? 'Manual' : 'Calculado'}</span>
                </td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => abrirEdit(d)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(d)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />
    </div>
  );
}

function ParametrosDepreciacao({ veiculo, parametros, onSaved }) {
  const { data, setData, put, processing, errors } = useForm({
    metodo_depreciacao: parametros.metodo_depreciacao ?? '',
    valor_aquisicao:    parametros.valor_aquisicao ?? '',
    valor_residual:     parametros.valor_residual ?? '',
    vida_util_anos:     parametros.vida_util_anos ?? '',
    vida_util_horas:    parametros.vida_util_horas ?? '',
    data_aquisicao:     parametros.data_aquisicao ?? '',
  });
  const submit = (ev) => {
    ev.preventDefault();
    put(route('admin.frota.veiculos.depreciacao.parametros', veiculo.id), {
      preserveScroll: true, onSuccess: () => onSaved && onSaved(),
    });
  };
  const isHr = parametros.tipo_hr;
  return (
    <form onSubmit={submit} className="bg-white rounded-lg border p-4 lg:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase text-gray-500">Parâmetros de depreciação</p>
        <span className="text-[11px] text-gray-400">{isHr ? 'ativo horimetrado' : 'ativo rodoviário'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm md:col-span-2">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Método</span>
          <select value={data.metodo_depreciacao} onChange={(ev) => setData('metodo_depreciacao', ev.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5">
            {METODOS_DEP.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <ParamF label="Valor de aquisição (R$)" name="valor_aquisicao" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <ParamF label="Valor residual (R$)" name="valor_residual" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <ParamF label="Vida útil (anos)" name="vida_util_anos" type="number" data={data} setData={setData} errors={errors} />
        <ParamF label="Vida útil (horas)" name="vida_util_horas" type="number" data={data} setData={setData} errors={errors} />
        <ParamF label="Data de aquisição" name="data_aquisicao" type="date" data={data} setData={setData} errors={errors} />
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={processing} className="px-4 py-1.5 bg-rise-600 text-white rounded text-sm font-medium hover:bg-rise-700 disabled:opacity-50">
          {processing ? 'Salvando…' : 'Salvar parâmetros'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Deixe em branco para usar o padrão ({isHr ? 'vida útil 10.000 h, residual 20%' : 'vida útil 5 anos, residual 10%'}).</p>
    </form>
  );
}

function ParamF({ label, name, type = 'text', step, data, setData, errors }) {
  return (
    <label className="text-sm">
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      <input type={type} step={step} value={data[name]} onChange={(e) => setData(name, e.target.value)}
             className="w-full border border-gray-300 rounded px-2 py-1.5" />
      {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </label>
  );
}

function ModalDepreciacao({ veiculo, depreciacao, onClose, onSaved }) {
  const editando = !!depreciacao?.id;
  const { data, setData, post, processing, errors } = useForm({
    valor_atual:    depreciacao?.valor_atual ?? '',
    referencia_mes: depreciacao?.referencia_mes ?? '',
    referencia_ano: depreciacao?.referencia_ano ?? new Date().getFullYear().toString(),
    _method:        editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.depreciacoes.update', depreciacao.id)
      : route('admin.frota.veiculos.depreciacoes.store', veiculo.id);
    post(url, { preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar depreciação #${depreciacao.id}` : 'Nova depreciação'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <F label="Valor atual (R$)" name="valor_atual" type="number" step="0.01" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Mês de referência" name="referencia_mes" data={data} setData={setData} errors={errors}>
          <select value={data.referencia_mes} onChange={(e) => setData('referencia_mes', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">Selecione</option>
            {MESES.map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
          </select>
        </F>
        <F label="Ano de referência" name="referencia_ano" data={data} setData={setData} errors={errors} />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Tacógrafo ============ */
function TabTacografo({ veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.tacografos.list', veiculo.id);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (t) => { setEditando(t); setShowForm(true); };
  const onSaved = () => { setShowForm(false); reload(); };
  const excluir = (t) => {
    if (!confirm('Remover este tacógrafo?')) return;
    router.delete(route('admin.frota.tacografos.destroy', t.id), { preserveScroll: true, onSuccess: reload });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Tacógrafo</h2>
        <div className="flex items-center gap-2">
          <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar descrição…" />
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo tacógrafo</button>
        </div>
      </div>

      {showForm && (
        <ModalTacografo veiculo={veiculo} tacografo={editando} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Emissão</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhum tacógrafo cadastrado.'}</td></tr>
            ) : rows.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{t.id}</td>
                <td className="px-3 py-2 font-medium">{t.descricao || '—'}</td>
                <td className="px-3 py-2">{fmtData(t.data_da_emissao)}</td>
                <td className="px-3 py-2">{fmtData(t.data_do_vencimento)}</td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => abrirEdit(t)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(t)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />
    </div>
  );
}

function ModalTacografo({ veiculo, tacografo, onClose, onSaved }) {
  const editando = !!tacografo?.id;
  const { data, setData, post, processing, errors } = useForm({
    descricao:          tacografo?.descricao ?? '',
    data_da_emissao:    tacografo?.data_da_emissao?.substring(0, 10) ?? '',
    data_do_vencimento: tacografo?.data_do_vencimento?.substring(0, 10) ?? '',
    observacao:         tacografo?.observacao ?? '',
    _method:            editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.tacografos.update', tacografo.id)
      : route('admin.frota.veiculos.tacografos.store', veiculo.id);
    post(url, { preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar tacógrafo #${tacografo.id}` : 'Novo tacógrafo'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <F label="Descrição *" name="descricao" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Data de emissão" name="data_da_emissao" type="date" data={data} setData={setData} errors={errors} />
        <F label="Data de vencimento" name="data_do_vencimento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Observações" name="observacao" data={data} setData={setData} errors={errors} className="md:col-span-2">
          <textarea value={data.observacao} onChange={(e) => setData('observacao', e.target.value)} rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
        </F>
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Pneus ============ */
function TabPneus({ veiculo }) {
  const [dados, setDados] = useState(null);
  const [modal, setModal] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await window.axios.get(route('admin.frota.veiculos.pneus.list', veiculo.id));
      setDados(data);
    } catch (e) { console.error('[pneus]', e); }
  }, [veiculo.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const definirLayout = (slug) => router.put(route('admin.frota.veiculos.pneus.config', veiculo.id),
    { config_pneus: slug }, { preserveScroll: true, onSuccess: carregar });
  const onSaved = () => { setModal(null); carregar(); };

  if (!dados) return <div className="text-gray-400 py-8 text-center">Carregando…</div>;

  if (!dados.layout) {
    return (
      <div className="max-w-md">
        <h2 className="text-lg font-semibold mb-2">Configuração de eixos</h2>
        <p className="text-sm text-gray-500 mb-3">Escolha o layout de posições deste veículo para habilitar a montagem de pneus.</p>
        <select onChange={(e) => e.target.value && definirLayout(e.target.value)} defaultValue=""
          className="w-full border border-gray-300 rounded px-3 py-2">
          <option value="" disabled>— selecione o layout —</option>
          {dados.layouts.map((l) => <option key={l.slug} value={l.slug}>{l.label}</option>)}
        </select>
      </div>
    );
  }

  const posicoesLivres = dados.layout.posicoes.filter((p) => !dados.montados[p.codigo]).map((p) => p.codigo);
  const corSulco = (s) => s == null ? 'text-gray-400' : (s < dados.sulco_minimo ? 'text-red-600' : (s < dados.sulco_alerta ? 'text-amber-600' : 'text-green-600'));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Pneus — {dados.layout.label}</h2>
          <p className="text-xs text-gray-500">
            Medição atual: {dados.medicao_atual != null ? `${Number(dados.medicao_atual).toLocaleString('pt-BR')} ${dados.medicao_tipo}` : '—'} · sulco mín. legal {dados.sulco_minimo} mm
          </p>
        </div>
        <select value={dados.config_pneus ?? ''} onChange={(e) => definirLayout(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          {dados.layouts.map((l) => <option key={l.slug} value={l.slug}>{l.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {dados.layout.posicoes.map((pos) => {
          const m = dados.montados[pos.codigo];
          return (
            <div key={pos.codigo} className={`rounded-lg border p-3 ${m ? 'bg-white' : 'bg-gray-50 border-dashed'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">{pos.codigo}</span>
                <span className="text-xs text-gray-400">{pos.label}</span>
              </div>
              {m ? (
                <div className="mt-2 text-sm">
                  <p className="font-medium">{m.numero_fogo}</p>
                  <p className="text-xs text-gray-500">{[m.marca, m.medida].filter(Boolean).join(' · ')} · {m.vida_atual > 0 ? `${m.vida_atual}ª vida` : 'Novo'}</p>
                  <p className="text-xs mt-1">Sulco: <span className={`font-semibold ${corSulco(m.sulco)}`}>{m.sulco != null ? `${m.sulco} mm` : '—'}</span></p>
                  <div className="mt-2 flex gap-1">
                    <button onClick={() => setModal({ tipo: 'rodiziar', pneu: m })} className="px-2 py-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">Rodízio</button>
                    <button onClick={() => setModal({ tipo: 'desmontar', pneu: m })} className="px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100">Desmontar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setModal({ tipo: 'montar', posicao: pos.codigo })} className="mt-3 w-full px-2 py-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100">+ Montar pneu</button>
              )}
            </div>
          );
        })}
      </div>

      {modal && <ModalPneuAcao veiculo={veiculo} contexto={modal} dados={dados} posicoesLivres={posicoesLivres} onClose={() => setModal(null)} onSaved={onSaved} />}
    </div>
  );
}

function ModalPneuAcao({ veiculo, contexto, dados, posicoesLivres, onClose, onSaved }) {
  const { tipo, posicao, pneu } = contexto;
  const { data, setData, post, processing, errors } = useForm({
    pneu_id: pneu?.id ?? '', posicao: posicao ?? '', nova_posicao: '', destino: 'estoque',
    medicao: dados.medicao_atual ?? '', data: new Date().toLocaleDateString('en-CA'),
  });
  const rotas = {
    montar: 'admin.frota.veiculos.pneus.montar',
    desmontar: 'admin.frota.veiculos.pneus.desmontar',
    rodiziar: 'admin.frota.veiculos.pneus.rodiziar',
  };
  const submit = (e) => { e.preventDefault(); post(route(rotas[tipo], veiculo.id), { preserveScroll: true, onSuccess: onSaved }); };
  const titulo = { montar: `Montar pneu em ${posicao}`, desmontar: `Desmontar ${pneu?.numero_fogo}`, rodiziar: `Rodízio de ${pneu?.numero_fogo}` }[tipo];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {tipo === 'montar' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Pneu (do estoque) *</label>
              <select value={data.pneu_id} onChange={(e) => setData('pneu_id', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">— selecione —</option>
                {dados.disponiveis.map((p) => <option key={p.id} value={p.id}>{p.numero_fogo} — {[p.marca, p.medida].filter(Boolean).join(' ')} {p.vida_atual > 0 ? `(${p.vida_atual}ª vida)` : '(novo)'}</option>)}
              </select>
              {errors.pneu_id && <p className="text-red-600 text-xs mt-1">{errors.pneu_id}</p>}
              {dados.disponiveis.length === 0 && <p className="text-amber-600 text-xs mt-1">Nenhum pneu em estoque — cadastre no catálogo de Pneus.</p>}
            </div>
          )}
          {tipo === 'rodiziar' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Nova posição *</label>
              <select value={data.nova_posicao} onChange={(e) => setData('nova_posicao', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">— selecione —</option>
                {posicoesLivres.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.nova_posicao && <p className="text-red-600 text-xs mt-1">{errors.nova_posicao}</p>}
            </div>
          )}
          {tipo === 'desmontar' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Destino</label>
              <select value={data.destino} onChange={(e) => setData('destino', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="estoque">Estoque</option>
                <option value="conserto">Conserto</option>
                <option value="recapadora">Recapadora</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Data *</label>
              <input type="date" value={data.data} onChange={(e) => setData('data', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Medição ({dados.medicao_tipo})</label>
              <input type="number" value={data.medicao} onChange={(e) => setData('medicao', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={processing} className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">{processing ? 'Salvando...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============ TAB: Abastecimentos ============ */
function TabAbastecimentos({ veiculo, obras = [], funcionarios = [], combustiveis = [] }) {
  const { rows, meta, resumo, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.abastecimentos.list', veiculo.id);
  const unidade = veiculo.tipo_hr ? 'hr' : 'km';
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (a) => { setEditando(a); setShowForm(true); };
  const onSaved = () => { setShowForm(false); reload(); };
  const excluir = (a) => {
    if (!confirm('Remover este abastecimento?')) return;
    router.delete(route('admin.frota.veiculos.abastecimentos.destroy', [veiculo.id, a.id]), { preserveScroll: true, onSuccess: reload });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Histórico de abastecimentos</h2>
        <div className="flex items-center gap-2">
          <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar fornecedor / combustível…" />
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700 whitespace-nowrap">+ Novo abastecimento</button>
        </div>
      </div>

      {/* KPIs sobre TODO o histórico (não só a página atual) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Total de litros" value={fmtNum(resumo?.total_litros ?? 0, 2)} />
        <Kpi label="Total gasto" value={fmtMoney(resumo?.total_gasto ?? 0)} />
        <Kpi label="# Abastecimentos" value={resumo?.total ?? 0} />
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs uppercase text-gray-500">CO₂ fóssil emitido</p>
          <p className="text-2xl font-bold text-rise-700">{fmtNum(resumo?.total_co2_fossil ?? 0, 2)} kg</p>
          <p className="text-xs text-gray-400 mt-0.5">+ {fmtNum(resumo?.total_co2_biogenico ?? 0, 2)} kg biogênico</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Combustível</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'Hr ant.' : 'Km ant.'}</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'Hr atual' : 'Km atual'}</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'Trab.' : 'Percorr.'}</th>
              <th className="px-3 py-2 text-right">Qtde.</th>
              <th className="px-3 py-2 text-right">R$/L</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'R$/hr' : 'R$/km'}</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right text-rise-700">CO₂</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={13} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={13} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhum abastecimento.'}</td></tr>
            ) : rows.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{a.id}</td>
                <td className="px-3 py-2">{fmtData(a.data_abastecimento)}</td>
                <td className="px-3 py-2 uppercase text-xs">{a.combustivel || '—'}</td>
                <td className="px-3 py-2 text-xs">{a.fornecedor || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtNum(a.medicao_inicial)}</td>
                <td className="px-3 py-2 text-right">{fmtNum(a.medicao_final)}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtNum(a.percorrido)} {unidade}</td>
                <td className="px-3 py-2 text-right">{fmtNum(a.quantidade, 2)} L</td>
                <td className="px-3 py-2 text-right">{fmtMoney(a.custo_por_litro)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(a.custo_por_km)}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtMoney(a.valor_total)}</td>
                <td className="px-3 py-2 text-right text-rise-700">{fmtNum(a.emissao_carbono, 2)} kg</td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => abrirEdit(a)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(a)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />

      {showForm && (
        <ModalAbastecimento veiculo={veiculo} abastecimento={editando} obras={obras} funcionarios={funcionarios} combustiveis={combustiveis} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}
    </div>
  );
}

/* CO₂ por litro de bomba a partir dos fatores da lista (mesma fórmula do back). */
function co2DoCombustivel(comb, litros) {
  const q = Number(litros) || 0;
  const perc = Number(comb?.perc_biogenico) || 0;
  const fossil = (1 - perc) * (Number(comb?.fator_fossil) || 0) * q;
  const bio = perc * (Number(comb?.fator_biogenico) || 0) * q;
  return { fossil, bio };
}

function ModalAbastecimento({ veiculo, abastecimento, obras = [], funcionarios = [], combustiveis = [], onClose, onSaved }) {
  const editando = !!abastecimento?.id;
  const tipoHr = !!veiculo.tipo_hr;
  const unidade = tipoHr ? 'hr' : 'km';

  const { data, setData, post, processing, errors } = useForm({
    data_abastecimento: abastecimento?.data_abastecimento?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    // Novo: combustível vem da lista. Novo abastecimento herda o padrão do veículo.
    id_combustivel: abastecimento?.id_combustivel ?? (editando ? '' : (veiculo.id_combustivel_padrao ?? '')),
    combustivel:  abastecimento?.combustivel ?? '',
    fornecedor:   abastecimento?.fornecedor ?? '',
    km_anterior:  tipoHr ? '' : (abastecimento?.medicao_inicial ?? ''),
    km_atual:     tipoHr ? '' : (abastecimento?.medicao_final ?? ''),
    hr_anterior:  tipoHr ? (abastecimento?.medicao_inicial ?? '') : '',
    hr_atual:     tipoHr ? (abastecimento?.medicao_final ?? '') : '',
    quantidade:   abastecimento?.quantidade ?? '',
    valor_do_litro: abastecimento?.valor_do_litro ?? '',
    valor_total:  abastecimento?.valor_total ?? '',
    id_obra:      abastecimento?.id_obra ?? '',
    id_funcionario: abastecimento?.id_funcionario ?? '',
    _method: editando ? 'put' : 'post',
  });

  const optObras = useMemo(() => obras.map((o) => ({ id: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);
  const optFuncionarios = useMemo(() => funcionarios.map((u) => ({ id: u.id, label: u.nome })), [funcionarios]);

  const antField = tipoHr ? 'hr_anterior' : 'km_anterior';
  const atualField = tipoHr ? 'hr_atual' : 'km_atual';

  // Total = quantidade × R$/L (auto ao preencher os dois; ainda editável à mão).
  const onQtd = (v) => setData((d) => ({ ...d, quantidade: v, valor_total: (Number(v) > 0 && Number(d.valor_do_litro) > 0) ? (Number(v) * Number(d.valor_do_litro)).toFixed(2) : d.valor_total }));
  const onLitro = (v) => setData((d) => ({ ...d, valor_do_litro: v, valor_total: (Number(v) > 0 && Number(d.quantidade) > 0) ? (Number(v) * Number(d.quantidade)).toFixed(2) : d.valor_total }));

  const combSel = combustiveis.find((c) => String(c.id) === String(data.id_combustivel));
  const onCombustivel = (id) => {
    const c = combustiveis.find((x) => String(x.id) === String(id));
    setData((d) => ({ ...d, id_combustivel: id, combustivel: c?.nome ?? d.combustivel }));
  };
  const co2 = co2DoCombustivel(combSel, data.quantidade);

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.veiculos.abastecimentos.update', [veiculo.id, abastecimento.id])
      : route('admin.frota.veiculos.abastecimentos.store', veiculo.id);
    post(url, { preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar abastecimento #${abastecimento.id}` : 'Novo abastecimento'} onClose={onClose} large>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <F label="Data *" name="data_abastecimento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Combustível" name="id_combustivel" errors={errors}>
          <select value={data.id_combustivel} onChange={(e) => onCombustivel(e.target.value)} className={inputCls}>
            <option value="">— selecione —</option>
            {combustiveis.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {!editando && veiculo.id_combustivel_padrao && <p className="text-[11px] text-gray-400 mt-0.5">padrão do veículo pré-selecionado</p>}
        </F>
        <F label="Fornecedor" name="fornecedor" data={data} setData={setData} errors={errors} placeholder="Ex.: posto interno" />

        <F label={`${tipoHr ? 'Hr' : 'Km'} anterior`} name={antField} type="number" data={data} setData={setData} errors={errors} />
        <F label={`${tipoHr ? 'Hr' : 'Km'} atual`} name={atualField} type="number" data={data} setData={setData} errors={errors} />
        <div />

        <F label="Quantidade (L) *" name="quantidade" errors={errors}>
          <input type="number" step="0.01" min="0" value={data.quantidade} onChange={(e) => onQtd(e.target.value)} className={inputCls} />
        </F>
        <F label="Valor do litro (R$/L)" name="valor_do_litro" errors={errors}>
          <input type="number" step="0.001" min="0" value={data.valor_do_litro} onChange={(e) => onLitro(e.target.value)} className={inputCls} />
        </F>
        <F label="Valor total (R$) *" name="valor_total" type="number" step="0.01" data={data} setData={setData} errors={errors} />

        <F label="Obra" name="id_obra" errors={errors}>
          <AutocompleteSelect value={data.id_obra} onChange={(v) => setData('id_obra', v)} options={optObras} placeholder="Buscar obra…" />
        </F>
        <F label="Responsável" name="id_funcionario" errors={errors}>
          <AutocompleteSelect value={data.id_funcionario} onChange={(v) => setData('id_funcionario', v)} options={optFuncionarios} placeholder="Buscar responsável…" />
        </F>
        <div className="flex flex-col justify-end">
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">CO₂ estimado</label>
          <p className="border border-gray-200 rounded px-3 py-2 bg-emerald-50 text-emerald-800 font-bold">
            {fmtNum(co2.fossil, 2)} kg <span className="text-xs font-normal text-emerald-600">fóssil</span>
          </p>
          {co2.bio > 0 && <p className="text-[11px] text-gray-400 mt-0.5">+ {fmtNum(co2.bio, 2)} kg biogênico</p>}
        </div>

        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Medições (hodômetro/horímetro) ============ */
function TabMedicoes({ veiculo, obras = [], funcionarios = [] }) {
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage, reload } =
    useServerList('admin.frota.veiculos.medicoes.list', veiculo.id);
  const unidade = veiculo.tipo_hr ? 'hr' : 'km';
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (m) => { setEditando(m); setShowForm(true); };
  const onSaved = () => { setShowForm(false); reload(); };
  const excluir = (m) => {
    if (!confirm('Remover esta medição?')) return;
    router.delete(route('admin.frota.veiculos.medicoes.destroy', [veiculo.id, m.id]), { preserveScroll: true, onSuccess: reload });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">{veiculo.tipo_hr ? 'Horímetros' : 'Hodômetros'}</h2>
        <div className="flex items-center gap-2">
          <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar data / responsável…" />
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700 whitespace-nowrap">+ Nova medição</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">Anterior</th>
              <th className="px-3 py-2 text-right">Novo</th>
              <th className="px-3 py-2 text-right">Δ</th>
              <th className="px-3 py-2">Cadastrado por</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Sem medições.'}</td></tr>
            ) : rows.map((m) => {
              const delta = (m.anterior != null && m.novo != null) ? (m.novo - m.anterior) : null;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">#{m.id}</td>
                  <td className="px-3 py-2">{fmtData(m.data)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(m.anterior)} {unidade}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtNum(m.novo)} {unidade}</td>
                  <td className="px-3 py-2 text-right text-rise-700">{delta != null ? `+${fmtNum(delta)} ${unidade}` : '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{m.user_create || '—'}</td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => abrirEdit(m)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(m)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />

      {showForm && (
        <ModalMedicao veiculo={veiculo} medicao={editando} ultimoNovo={rows[0]?.novo ?? ''} obras={obras} funcionarios={funcionarios} onClose={() => setShowForm(false)} onSaved={onSaved} />
      )}
    </div>
  );
}

function ModalMedicao({ veiculo, medicao, ultimoNovo = '', obras = [], funcionarios = [], onClose, onSaved }) {
  const editando = !!medicao?.id;
  const unidade = veiculo.tipo_hr ? 'hr' : 'km';

  const { data, setData, post, processing, errors } = useForm({
    data: medicao?.data?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    anterior: medicao?.anterior ?? (editando ? '' : ultimoNovo),
    novo: medicao?.novo ?? '',
    id_obra: medicao?.id_obra ?? '',
    id_funcionario: medicao?.id_funcionario ?? '',
    _method: editando ? 'put' : 'post',
  });

  const optObras = useMemo(() => obras.map((o) => ({ id: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);
  const optFuncionarios = useMemo(() => funcionarios.map((u) => ({ id: u.id, label: u.nome })), [funcionarios]);

  const delta = (Number(data.novo) || 0) - (Number(data.anterior) || 0);

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.veiculos.medicoes.update', [veiculo.id, medicao.id])
      : route('admin.frota.veiculos.medicoes.store', veiculo.id);
    post(url, { preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar medição #${medicao.id}` : `Nova medição (${unidade})`} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <F label="Data *" name="data" type="date" data={data} setData={setData} errors={errors} />
        <F label={`${unidade} anterior`} name="anterior" type="number" data={data} setData={setData} errors={errors} />
        <F label={`${unidade} novo *`} name="novo" type="number" data={data} setData={setData} errors={errors} />

        <F label="Obra" name="id_obra" errors={errors}>
          <AutocompleteSelect value={data.id_obra} onChange={(v) => setData('id_obra', v)} options={optObras} placeholder="Buscar obra…" />
        </F>
        <F label="Responsável" name="id_funcionario" errors={errors}>
          <AutocompleteSelect value={data.id_funcionario} onChange={(v) => setData('id_funcionario', v)} options={optFuncionarios} placeholder="Buscar responsável…" />
        </F>
        <div className="flex flex-col justify-end">
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Percorrido (Δ)</label>
          <p className={`border rounded px-3 py-2 font-bold ${delta < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 border-gray-200'}`}>{delta >= 0 ? '+' : ''}{fmtNum(delta)} {unidade}</p>
        </div>

        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ Modal: Cadastrar / Editar OS Preventiva ============ */
const osInp = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500';
const osLbl = 'block text-[11px] font-semibold text-gray-600 mb-0.5 uppercase';

function ModalOsPreventiva({ veiculo, mode = 'create', ciclo = null, osId = null, medicaoAtual = 0, unidade = 'km', fornecedores = [], obras = [], funcionarios = [], onClose, onSaved }) {
  const hoje = new Date().toISOString().substring(0, 10);
  const [carregando, setCarregando] = useState(true);
  const [grupos, setGrupos] = useState([]);          // [{periodo, itens:[{key, id_servico_preventiva, nome_servico, periodo, pendencia}]}]
  const [abertos, setAbertos] = useState({});        // {periodo: bool}
  const [itensState, setItensState] = useState({});  // {key: {status, observacao}}
  const [medAtual, setMedAtual] = useState(medicaoAtual);

  const { data, setData, post, transform, processing, errors } = useForm({
    periodo: ciclo?.periodo ?? '',
    medicao_proxima: '',
    id_obra: veiculo.obra_id ?? '',
    fornecedor_id: '',
    id_motorista: '',
    situacao: 2,
    tipo: '',
    campo_cal_mes: '',
    data_de_execucao: hoje,
    data_conclusao: '',
    data_de_vencimento: '',
    // Notas fiscais como lista repetível (igual à corretiva).
    notas_fiscais: [{ numero: '', data: '', valor: '', arquivo: null, arquivo_novo: null }],
    descricao: '',
    anexo: null,
  });

  // ---- Carrega checklist (create) ou a OS existente (edit) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setCarregando(true);
      try {
        if (mode === 'create') {
          const { data: r } = await window.axios.get(route('admin.frota.veiculos.os-preventiva.itens', { veiculo: veiculo.id, periodo: ciclo.periodo }));
          if (!alive) return;
          const gs = (r.grupos || []).map((g) => ({ periodo: g.periodo, itens: g.itens.map((it) => ({ ...it, key: it.id_servico_preventiva })) }));
          setGrupos(gs);
          const init = {};
          gs.forEach((g) => g.itens.forEach((it) => { init[it.key] = { status: 'sim', observacao: '' }; }));
          setItensState(init);
          setAbertos(Object.fromEntries(gs.map((g, i) => [g.periodo, i === 0])));
          setMedAtual(r.medicao_atual ?? medicaoAtual);
          setData((d) => ({ ...d, periodo: r.periodo, medicao_proxima: r.medicao_proxima_sugerida ?? '', campo_cal_mes: r.periodo_mes || '' }));
        } else {
          const { data: os } = await window.axios.get(route('admin.frota.os-preventiva.show', osId));
          if (!alive) return;
          const porCiclo = {};
          (os.servicos || []).forEach((s) => {
            const per = s.periodo ?? 0;
            (porCiclo[per] ||= []).push({ key: s.id, id_servico_preventiva: s.id_servico_preventiva, nome_servico: s.nome_servico, periodo: per, pendencia: null });
          });
          const gs = Object.keys(porCiclo).map(Number).sort((a, b) => b - a).map((per) => ({ periodo: per, itens: porCiclo[per] }));
          setGrupos(gs);
          setItensState((os.servicos || []).reduce((acc, s) => { acc[s.id] = { status: s.status || 'sim', observacao: s.observacao || '' }; return acc; }, {}));
          setAbertos(Object.fromEntries(gs.map((g, i) => [g.periodo, i === 0])));
          setMedAtual((veiculo.tipo_hr ? os.horimetro_atual : os.quilometragem_atual) ?? medicaoAtual);
          setData((d) => ({
            ...d,
            periodo: os.campo_cal_hr ?? os.campo_calc_km ?? '',
            medicao_proxima: (veiculo.tipo_hr ? os.horimetro_proximo : os.quilometragem_nova) ?? '',
            id_obra: os.id_obra ?? '',
            fornecedor_id: os.fornecedor_id ?? '',
            id_motorista: os.id_motorista ?? '',
            situacao: Number(os.status_realizado) || 2,
            tipo: os.tipo ?? '',
            campo_cal_mes: os.campo_cal_mes ?? '',
            data_de_execucao: os.data_de_execucao ?? hoje,
            data_conclusao: os.data_conclusao ?? '',
            data_de_vencimento: os.data_de_vencimento ?? '',
            notas_fiscais: (os.notas_fiscais?.length
              ? os.notas_fiscais.map((n) => ({ numero: n.numero ?? '', data: (n.data ?? '').substring(0, 10), valor: n.valor ?? '', arquivo: n.arquivo ?? null, arquivo_novo: null }))
              : [{ numero: '', data: '', valor: '', arquivo: null, arquivo_novo: null }]),
            descricao: os.descricao ?? '',
          }));
        }
      } catch (e) { console.error('[OS preventiva load]', e); }
      finally { if (alive) setCarregando(false); }
    })();
    return () => { alive = false; };
  }, [mode, osId, ciclo?.periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data da próxima revisão = (conclusão || execução) + campo_cal_mes meses.
  useEffect(() => {
    const base = data.data_conclusao || data.data_de_execucao;
    const meses = parseInt(data.campo_cal_mes, 10);
    if (base && meses > 0) {
      const dt = new Date(base + 'T00:00:00');
      dt.setMonth(dt.getMonth() + meses);
      setData('data_de_vencimento', dt.toISOString().substring(0, 10));
    }
  }, [data.data_conclusao, data.data_de_execucao, data.campo_cal_mes]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhas = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);
  const idxDe = useMemo(() => {
    const m = {}; let i = 0;
    grupos.forEach((g) => g.itens.forEach((it) => { m[it.key] = i++; }));
    return m;
  }, [grupos]);

  const setItem = (key, patch) =>
    setItensState((s) => ({ ...s, [key]: { ...(s[key] || { status: 'sim', observacao: '' }), ...patch } }));

  // Autocompletes (id + rótulo) e notas fiscais repetíveis — mesmo padrão da corretiva.
  const optFornecedores = useMemo(() => fornecedores.map((f) => ({ id: f.id, label: f.nome_fantasia })), [fornecedores]);
  const optObras = useMemo(() => obras.map((o) => ({ id: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);
  const optFuncionarios = useMemo(() => funcionarios.map((u) => ({ id: u.id, label: u.nome })), [funcionarios]);

  const linhaNfVazia = { numero: '', data: '', valor: '', arquivo: null, arquivo_novo: null };
  const addNota = () => setData('notas_fiscais', [...(data.notas_fiscais || []), { ...linhaNfVazia }]);
  const removeNota = (idx) => setData('notas_fiscais',
    (data.notas_fiscais || []).length > 1 ? data.notas_fiscais.filter((_, i) => i !== idx) : data.notas_fiscais);
  const setNota = (idx, campo, valor) => setData('notas_fiscais',
    (data.notas_fiscais || []).map((n, i) => (i === idx ? { ...n, [campo]: valor } : n)));

  const totalNotas = (data.notas_fiscais || []).reduce((acc, n) => acc + (Number(n.valor) || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    transform((d) => ({
      ...d,
      itens: linhas.map((l) => {
        const st = itensState[l.key] || { status: 'sim', observacao: '' };
        return mode === 'edit'
          ? { id: l.key, status: st.status, observacao: st.observacao }
          : { id_servico_preventiva: l.id_servico_preventiva, periodo: l.periodo, status: st.status, observacao: st.observacao };
      }),
      ...(mode === 'edit' ? { _method: 'put' } : {}),
    }));
    const url = mode === 'edit'
      ? route('admin.frota.os-preventiva.update', osId)
      : route('admin.frota.veiculos.os-preventiva.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => { onSaved?.(); onClose(); } });
  };

  const titulo = mode === 'edit'
    ? `Editar OS Preventiva #${osId}`
    : `Cadastrar OS Preventiva — Ciclo ${Number(ciclo?.periodo ?? 0).toLocaleString('pt-BR')} ${unidade}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-6 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">🛠 {titulo}</h2>
            <p className="text-xs text-gray-500">{veiculo.prefixo} · medição atual: <strong>{Number(medAtual).toLocaleString('pt-BR')} {unidade}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </header>

        {carregando ? (
          <div className="p-10 text-center text-gray-400">Carregando…</div>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-5 gap-0" encType="multipart/form-data">
            {/* ===== Esquerda: dados da OS ===== */}
            <div className="lg:col-span-2 p-5 border-r space-y-3 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={osLbl}>Obra *</label>
                  <AutocompleteSelect value={data.id_obra} onChange={(v) => setData('id_obra', v)} options={optObras} placeholder="Buscar obra…" />
                  {errors.id_obra && <p className="text-red-600 text-xs mt-0.5">{errors.id_obra}</p>}
                </div>
                <div className="col-span-2">
                  <label className={osLbl}>Fornecedor</label>
                  <AutocompleteSelect value={data.fornecedor_id} onChange={(v) => setData('fornecedor_id', v)} options={optFornecedores} placeholder="Buscar fornecedor…" />
                  {errors.fornecedor_id && <p className="text-red-600 text-xs mt-0.5">{errors.fornecedor_id}</p>}
                </div>
                <div className="col-span-2">
                  <label className={osLbl}>Motorista do veículo</label>
                  <AutocompleteSelect value={data.id_motorista} onChange={(v) => setData('id_motorista', v)} options={optFuncionarios} placeholder="Buscar responsável…" />
                </div>
                <div className="col-span-2 bg-rise-50/60 border border-rise-200 rounded p-2">
                  <label className={osLbl}>Situação da Manutenção *</label>
                  <select value={data.situacao} onChange={(e) => setData('situacao', Number(e.target.value))} className={osInp}>
                    <option value={1}>Pendente</option>
                    <option value={2}>Em Execução</option>
                    <option value={3}>Concluído</option>
                    <option value={4}>Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className={osLbl}>{unidade} atual</label>
                  <input type="text" value={Number(medAtual).toLocaleString('pt-BR')} readOnly className={`${osInp} bg-gray-50`} />
                </div>
                <div>
                  <label className={osLbl}>Próx. {unidade}</label>
                  <input type="number" value={data.medicao_proxima} onChange={(e) => setData('medicao_proxima', e.target.value)} className={osInp} />
                </div>

                <div>
                  <label className={osLbl}>Início *</label>
                  <input type="date" value={data.data_de_execucao} onChange={(e) => setData('data_de_execucao', e.target.value)} className={osInp} />
                  {errors.data_de_execucao && <p className="text-red-600 text-xs mt-0.5">{errors.data_de_execucao}</p>}
                </div>
                <div>
                  <label className={osLbl}>Término</label>
                  <input type="date" value={data.data_conclusao} onChange={(e) => setData('data_conclusao', e.target.value)} className={osInp} />
                </div>

                <div>
                  <label className={osLbl}>Próx. rev./ meses</label>
                  <input type="number" value={data.campo_cal_mes} onChange={(e) => setData('campo_cal_mes', e.target.value)} className={`${osInp} bg-gray-50`} />
                </div>
                <div>
                  <label className={osLbl}>Data próx. revisão</label>
                  <input type="date" value={data.data_de_vencimento} onChange={(e) => setData('data_de_vencimento', e.target.value)} className={osInp} />
                </div>

                <div className="col-span-2">
                  <label className={osLbl}>Observações</label>
                  <textarea rows={2} value={data.descricao} onChange={(e) => setData('descricao', e.target.value)} className={osInp} />
                </div>
                <div className="col-span-2">
                  <label className={osLbl}>Anexo (NF, comprovante)</label>
                  <input type="file" onChange={(e) => setData('anexo', e.target.files[0] ?? null)} className="text-xs" accept="image/*,.pdf" />
                  {errors.anexo && <p className="text-red-600 text-xs mt-0.5">{errors.anexo}</p>}
                </div>
              </div>
            </div>

            {/* ===== Direita: checklist de serviços por ciclo ===== */}
            <div className="lg:col-span-3 p-5 max-h-[75vh] overflow-y-auto">
              <div className="border border-rise-200 bg-rise-50/40 rounded px-3 py-2 text-sm text-rise-800 mb-3">
                Serviços a serem executados {data.campo_cal_mes ? `a cada ${fmtNum(data.periodo)} ${unidade} ou ${data.campo_cal_mes} meses` : `a cada ${fmtNum(data.periodo)} ${unidade}`}
              </div>

              {linhas.length === 0 && (
                <p className="text-sm text-gray-500 bg-gray-50 border rounded p-3">Este ciclo não tem itens de serviço cadastrados no plano.</p>
              )}

              {grupos.map((g) => (
                <div key={g.periodo} className="border rounded-lg mb-2 overflow-hidden">
                  <button type="button" onClick={() => setAbertos((a) => ({ ...a, [g.periodo]: !a[g.periodo] }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100">
                    <span className="font-semibold text-sm text-gray-700">Serviços do Ciclo {fmtNum(g.periodo)} {unidade}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs bg-rise-600 text-white px-2 py-0.5 rounded">{g.itens.length} {g.itens.length === 1 ? 'item' : 'itens'}</span>
                      <span className="text-gray-400 text-xs">{abertos[g.periodo] ? '▲' : '▼'}</span>
                    </span>
                  </button>

                  {abertos[g.periodo] && (
                    <table className="w-full text-sm">
                      <thead className="bg-white text-left text-xs text-gray-500 border-b">
                        <tr>
                          <th className="px-3 py-1.5">Nome do Serviço</th>
                          <th className="px-3 py-1.5 w-32">Realizado?</th>
                          <th className="px-3 py-1.5">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {g.itens.map((it) => {
                          const st = itensState[it.key] || { status: 'sim', observacao: '' };
                          const errObs = errors[`itens.${idxDe[it.key]}.observacao`];
                          return (
                            <tr key={it.key} className="align-top">
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-800">{it.nome_servico || '—'}</div>
                                {it.pendencia && (
                                  <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    ⚠ Não realizado em {fmtData(it.pendencia.data)} (OS #{it.pendencia.os_id}): {it.pendencia.observacao || 'sem justificativa'}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <label className="inline-flex items-center gap-1 mr-3 cursor-pointer">
                                  <input type="radio" name={`st-${it.key}`} checked={st.status === 'sim'} onChange={() => setItem(it.key, { status: 'sim' })} />
                                  <span className="text-green-700">Sim</span>
                                </label>
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name={`st-${it.key}`} checked={st.status === 'nao'} onChange={() => setItem(it.key, { status: 'nao' })} />
                                  <span className="text-red-700">Não</span>
                                </label>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={st.observacao}
                                  onChange={(e) => setItem(it.key, { observacao: e.target.value })}
                                  placeholder={st.status === 'nao' ? 'Justificativa obrigatória' : 'Opcional'}
                                  className={`w-full border rounded px-2 py-1 text-sm ${st.status === 'nao' && (!st.observacao || errObs) ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                />
                                {errObs && <p className="text-red-600 text-xs mt-0.5">{errObs}</p>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>

            {/* ===== Notas fiscais — lista repetível com Adicionar/Remover + total ===== */}
            <div className="lg:col-span-5 border-t px-6 py-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-rise-700">Notas fiscais</p>
                <div className="flex gap-2">
                  <button type="button" onClick={addNota}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#557bbb] text-white hover:bg-[#3a5a8c]">
                    Adicionar NF
                  </button>
                  <button type="button" onClick={() => removeNota(data.notas_fiscais.length - 1)}
                    disabled={data.notas_fiscais.length <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                    Remover NF
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {data.notas_fiscais.map((n, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_0.9fr_1.3fr_auto] gap-2 items-end">
                    <div>
                      {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Núm. NF / NFSE</label>}
                      <input value={n.numero} onChange={(e) => setNota(idx, 'numero', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Data NF</label>}
                      <input type="date" value={n.data} onChange={(e) => setNota(idx, 'data', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Valor (R$)</label>}
                      <input type="number" step="0.01" min="0" value={n.valor} onChange={(e) => setNota(idx, 'valor', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      {idx === 0 && <label className="block text-[11px] font-semibold text-gray-600 mb-1">Arquivo PDF</label>}
                      <DropFileField compact pdfOnly
                        onFile={(f) => setNota(idx, 'arquivo_novo', f)}
                        viewHref={mode === 'edit' && n.arquivo ? route('admin.frota.os-preventiva.nota-arquivo', [osId, idx]) : null} />
                    </div>
                    <button type="button" onClick={() => removeNota(idx)} disabled={data.notas_fiscais.length <= 1}
                      title="Remover esta NF"
                      className="h-[38px] w-9 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30">
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-3">
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase text-gray-500">Total das Notas Fiscais</p>
                  <div className="mt-1 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">{fmtMoney(totalNotas)}</div>
                </div>
              </div>
            </div>

            {/* ===== Rodapé ===== */}
            <div className="lg:col-span-5 flex justify-end gap-2 border-t px-6 py-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">Cancelar</button>
              <button type="submit" disabled={processing} className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50 text-sm font-semibold">
                {processing ? 'Salvando…' : (mode === 'edit' ? 'Salvar alterações' : 'Salvar')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============ Modal: Ver OS Preventiva (somente leitura) ============ */
function ModalVerOs({ osId, unidade = 'km', tipoHr = false, onClose }) {
  const [os, setOs] = useState(null);
  useEffect(() => {
    let alive = true;
    window.axios.get(route('admin.frota.os-preventiva.show', osId))
      .then(({ data }) => { if (alive) setOs(data); })
      .catch((e) => console.error('[ver OS]', e));
    return () => { alive = false; };
  }, [osId]);

  const sit = os ? (situacaoCorretiva[os.status_realizado] ?? { label: os.status_realizado, cor: 'bg-gray-200 text-gray-700' }) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-base font-bold">OS Preventiva #{osId}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </header>
        {!os ? (
          <div className="p-10 text-center text-gray-400">Carregando…</div>
        ) : (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Info label="Situação" value={<span className={`px-2 py-0.5 rounded text-xs ${sit.cor}`}>{sit.label}</span>} />
              <Info label="Obra" value={os.obra?.nome_fantasia ?? '—'} />
              <Info label="Fornecedor" value={os.fornecedor?.nome_fantasia ?? '—'} />
              <Info label="Motorista" value={os.motorista?.nome ?? '—'} />
              <Info label="Plano" value={os.preventiva?.nome_preventiva ?? '—'} />
              <Info label="Ciclo" value={`${fmtNum(tipoHr ? os.campo_cal_hr : os.campo_calc_km)} ${unidade}`} />
              <Info label={`${unidade} atual`} value={fmtNum(tipoHr ? os.horimetro_atual : os.quilometragem_atual)} />
              <Info label={`Próx. ${unidade}`} value={fmtNum(tipoHr ? os.horimetro_proximo : os.quilometragem_nova)} />
              <Info label="Execução" value={fmtData(os.data_de_execucao)} />
              <Info label="Conclusão" value={fmtData(os.data_conclusao)} />
              <Info label="Próx. revisão" value={fmtData(os.data_de_vencimento)} />
              <Info label="Total das NFs" value={fmtMoney(os.total_valor_servico)} />
            </div>

            {(os.notas_fiscais || []).length > 0 && (
              <div>
                <p className="text-xs uppercase text-gray-500 mb-1">Notas fiscais</p>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500">
                      <tr><th className="px-3 py-1.5">Núm. NF / NFSE</th><th className="px-3 py-1.5 w-28">Data</th><th className="px-3 py-1.5 w-32 text-right">Valor</th><th className="px-3 py-1.5 w-24">PDF</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {os.notas_fiscais.map((n, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-gray-800">{n.numero || '—'}</td>
                          <td className="px-3 py-2">{fmtData(n.data)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(n.valor)}</td>
                          <td className="px-3 py-2">
                            {n.arquivo
                              ? <a href={route('admin.frota.os-preventiva.nota-arquivo', [os.id, n.idx ?? i])} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">Abrir</a>
                              : <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {os.descricao && (
              <div>
                <p className="text-xs uppercase text-gray-500 mb-1">Observações</p>
                <p className="text-sm bg-gray-50 border rounded p-2 whitespace-pre-wrap">{os.descricao}</p>
              </div>
            )}

            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Checklist de serviços</p>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr><th className="px-3 py-1.5">Serviço</th><th className="px-3 py-1.5 w-24">Ciclo</th><th className="px-3 py-1.5 w-28">Realizado?</th><th className="px-3 py-1.5">Observação</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {(os.servicos || []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-gray-400 py-4">Sem checklist.</td></tr>
                    ) : os.servicos.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 font-medium text-gray-800">{s.nome_servico || '—'}</td>
                        <td className="px-3 py-2">{s.periodo ? `${fmtNum(s.periodo)} ${unidade}` : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'sim' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {s.status === 'sim' ? 'Realizado' : 'Não realizado'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{s.observacao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Arquivos anexados</p>
              <ListaArquivos arquivos={montarArquivos(os, 'os-preventiva', 'admin.frota.os-preventiva.nota-arquivo')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-rise-500 focus:border-rise-500';

function F({ label, name, type = 'text', step, placeholder, data, setData, errors, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      {children ?? (
        <input type={type} step={step} placeholder={placeholder}
               value={data?.[name] ?? ''} onChange={(e) => setData(name, e.target.value)}
               className={inputCls} />
      )}
      {errors?.[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );
}

/* ============ helpers de UI ============ */
function Card({ title, className = '', children }) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value, mono = false, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`font-semibold ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-400">—</span>}
      </p>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg border p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
