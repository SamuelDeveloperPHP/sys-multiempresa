import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/* ============ helpers de formatação ============ */
const fmtMoney = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtNum   = (v, dec = 0) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
const fmtData  = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

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
  { id: 'detalhes',       label: 'Detalhes' },
  { id: 'galeria',        label: 'Biblioteca' },
  { id: 'docs_tecnicos',  label: "Doc's Técnicos" },
  { id: 'docs_legais',    label: "Doc's Legais" },
  { id: 'corretivas',     label: 'Corretivas' },
  { id: 'preventivas',    label: 'Preventivas' },
  { id: 'seguros',        label: 'Seguros' },
  { id: 'ipvas',          label: "IPVA's" },
  { id: 'abastecimentos', label: 'Abastecimentos' },
  { id: 'medicoes',       label: 'Hodômetro/Horímetro' },
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
  servicos_preventiva: servicosPreventiva = [],
  fornecedores = [],
  obras = [],
  funcionarios = [],
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
          {tab === 'preventivas'    && <TabPreventivas registros={preventivas} dashboard={dashboardCiclos} historico={servicosPreventiva} veiculo={veiculo} fornecedores={fornecedores} />}
          {tab === 'seguros'        && <TabSeguros veiculo={veiculo} />}
          {tab === 'ipvas'          && <TabIpvas veiculo={veiculo} />}
          {tab === 'abastecimentos' && <TabAbastecimentos veiculo={veiculo} />}
          {tab === 'medicoes'       && <TabMedicoes veiculo={veiculo} />}
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
function ModalShell({ title, onClose, children, large = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${large ? 'max-w-4xl' : 'max-w-2xl'} my-4`} onClick={(e) => e.stopPropagation()}>
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

function FileFieldOneDrive({ label, subfolder, setData, errors, veiculo, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      <input type="file" onChange={(e) => setData('arquivo', e.target.files[0] ?? null) || setData('anexo', e.target.files[0] ?? null)} className="text-sm" accept="image/*,.pdf" />
      <p className="text-xs text-gray-500 mt-1">Vai para o OneDrive em veiculos/{veiculo.id}/{subfolder}/</p>
      {(errors?.arquivo || errors?.anexo) && <p className="text-red-600 text-xs mt-1">{errors.arquivo || errors.anexo}</p>}
    </div>
  );
}

/* ============ TAB: Corretivas ============
 * Auto-suficiente (mesmo padrão dos docs): busca a listagem via GET paginado
 * com pesquisa as-you-type por fornecedor / tipo / descrição. */
function TabCorretivas({ veiculo, fornecedores = [], obras = [], funcionarios = [] }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
                    {m.tem_arquivo && (
                      <a href={route('admin.frota.anexos.view', ['manutencao', m.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Anexo</a>
                    )}
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
    valor_do_servico:      manutencao?.valor_do_servico ?? '',
    valor_da_mao_obra:     manutencao?.valor_da_mao_obra ?? '',
    nf_pecas:              manutencao?.nf_pecas ?? '',
    nf_mao_obra:           manutencao?.nf_mao_obra ?? '',
    descricao:             manutencao?.descricao ?? '',
    arquivo:               null,
    _method:               editando ? 'put' : 'post',
  });

  const total = (Number(data.valor_do_servico) || 0) + (Number(data.valor_da_mao_obra) || 0);

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.manutencoes.update', manutencao.id)
      : route('admin.frota.veiculos.manutencoes.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => (onSaved ? onSaved() : onClose()) });
  };

  return (
    <ModalShell title={editando ? `Editar manutenção #${manutencao.id}` : 'Nova manutenção corretiva'} onClose={onClose} large>
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
            <select value={data.fornecedor_id} onChange={(e) => setData('fornecedor_id', e.target.value)} className={inputCls}>
              <option value="">— selecione —</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
            </select>
          </F>
          <F label="Obra" name="id_obra" errors={errors}>
            <select value={data.id_obra} onChange={(e) => setData('id_obra', e.target.value)} className={inputCls}>
              <option value="">— selecione —</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.code ? `${o.code} — ` : ''}{o.nome_fantasia}</option>)}
            </select>
          </F>
          <F label="Responsável" name="id_usuario" errors={errors}>
            <select value={data.id_usuario} onChange={(e) => setData('id_usuario', e.target.value)} className={inputCls}>
              <option value="">— selecione —</option>
              {funcionarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
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

        <SecaoForm titulo="Custo">
          <F label="Valor peças/serviço (R$)" name="valor_do_servico" type="number" step="0.01" data={data} setData={setData} errors={errors} />
          <F label="NF peças" name="nf_pecas" data={data} setData={setData} errors={errors} />
          <div></div>
          <F label="Valor mão de obra (R$)" name="valor_da_mao_obra" type="number" step="0.01" data={data} setData={setData} errors={errors} />
          <F label="NF mão de obra" name="nf_mao_obra" data={data} setData={setData} errors={errors} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Total</label>
            <div className="px-3 py-2 rounded border border-gray-200 bg-gray-50 text-gray-800 font-semibold text-sm">{fmtMoney(total)}</div>
          </div>
        </SecaoForm>

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
function TabPreventivas({ dashboard, historico, veiculo, registros, fornecedores = [] }) {
  const [cicloParaOs, setCicloParaOs] = useState(null);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          veiculo={veiculo}
          ciclo={cicloParaOs}
          medicaoAtual={medicao_atual}
          unidade={unidade}
          fornecedores={fornecedores}
          onClose={() => setCicloParaOs(null)}
        />
      )}

      <div className="bg-white border rounded-lg mt-6">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold">📜 Histórico de OS Preventivas</h3>
          <span className="text-sm text-gray-500">{historico.length} execuções</span>
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {historico.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-500 py-6">Nenhuma OS preventiva executada.</td></tr>
              ) : historico.map((h) => {
                const cicloLabel = veiculo.tipo_hr ? h.campo_cal_hr : h.campo_calc_km;
                const atual = veiculo.tipo_hr ? h.horimetro_atual : h.quilometragem_atual;
                const prox  = veiculo.tipo_hr ? h.horimetro_proximo : h.quilometragem_nova;
                const sit = situacaoCorretiva[h.status_realizado] ?? { label: h.status_realizado || '—', cor: 'bg-gray-200 text-gray-700' };
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
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${sit.cor}`}>{sit.label}</span></td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtMoney(h.total_valor_servico)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CicloCard({ ciclo, unidade, medicaoAtual, onCadastrar }) {
  const { periodo, alvo, distancia, progresso, data_ultima, data_vencimento, estado, bloqueio, qtd_itens } = ciclo;

  const palette = {
    mestre:              { borda: 'border-rise-500 ring-2 ring-rise-300', barra: 'bg-rise-500', titulo: 'text-rise-700', icone: '✅' },
    bloqueado_por_maior: { borda: 'border-gray-300', barra: 'bg-gray-300', titulo: 'text-gray-500', icone: '🔒' },
    vencido:             { borda: 'border-red-500', barra: 'bg-red-500', titulo: 'text-red-600', icone: '⚠' },
    aguardando:          { borda: 'border-blue-300', barra: 'bg-blue-400', titulo: 'text-blue-700', icone: '🔧' },
  };
  const p = palette[estado] ?? palette.aguardando;

  return (
    <div className={`bg-white border-t-4 ${p.borda} rounded-lg shadow-sm border-x border-b p-4 flex flex-col`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold">Ciclo {fmtNum(periodo)} {unidade}</p>
          <p className={`text-lg font-bold ${p.titulo}`}>
            {estado === 'vencido' && 'Vencido'}
            {estado === 'mestre' && 'Próximo!'}
            {estado === 'bloqueado_por_maior' && 'Aguarda OS maior'}
            {estado === 'aguardando' && (
              <>
                {fmtNum(distancia)} <span className="text-xs text-gray-500 font-normal">{unidade} faltantes</span>
              </>
            )}
          </p>
        </div>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${p.barra} bg-opacity-20`}>{p.icone}</span>
      </div>

      <div className="my-2">
        <div className="h-2 bg-gray-100 rounded">
          <div className={`h-2 ${p.barra} rounded ${estado === 'mestre' ? 'animate-pulse' : ''}`} style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Atual: {fmtNum(medicaoAtual)}</span>
          <span>Target: {fmtNum(alvo)}</span>
        </div>
      </div>

      <div className="border-t pt-2 text-xs space-y-1">
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

      <div className="mt-3">
        {estado === 'mestre' ? (
          <button
            onClick={onCadastrar}
            className="w-full bg-rise-600 text-white py-2 rounded font-semibold hover:bg-rise-700 animate-pulse"
          >
            🔧 Cadastrar OS
          </button>
        ) : (
          <button disabled className="w-full bg-gray-100 text-gray-500 py-2 rounded text-xs border cursor-not-allowed">
            🔒 {bloqueio}
          </button>
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
                <td className="px-3 py-2 text-right space-x-2">
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
  const { data, setData, post, put, processing, errors } = useForm({
    nome_seguradora:  seguro?.nome_seguradora ?? '',
    valor:            seguro?.valor ?? '',
    carencia_inicial: seguro?.carencia_inicial?.substring(0, 10) ?? '',
    carencia_final:   seguro?.carencia_final?.substring(0, 10) ?? '',
  });

  const done = () => (onSaved ? onSaved() : onClose());
  const submit = (e) => {
    e.preventDefault();
    if (editando) put(route('admin.frota.seguros.update', seguro.id), { preserveScroll: true, onSuccess: done });
    else post(route('admin.frota.veiculos.seguros.store', veiculo.id), { preserveScroll: true, onSuccess: done });
  };

  return (
    <ModalShell title={editando ? `Editar seguro #${seguro.id}` : 'Novo seguro'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <F label="Seguradora *" name="nome_seguradora" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Valor (R$)" name="valor" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <div></div>
        <F label="Carência inicial" name="carencia_inicial" type="date" data={data} setData={setData} errors={errors} />
        <F label="Carência final" name="carencia_final" type="date" data={data} setData={setData} errors={errors} />
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
                    ? <a href={route('admin.frota.anexos.view', ['ipva', i.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Abrir</a>
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

/* ============ TAB: Abastecimentos ============ */
function TabAbastecimentos({ veiculo }) {
  const { rows, meta, resumo, loading, busca, setBusca, buscaDebounced, setPage } =
    useServerList('admin.frota.veiculos.abastecimentos.list', veiculo.id);
  const unidade = veiculo.tipo_hr ? 'hr' : 'km';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Histórico de abastecimentos</h2>
        <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar fornecedor / combustível…" />
      </div>

      {/* KPIs sobre TODO o histórico (não só a página atual) */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Kpi label="Total de litros" value={fmtNum(resumo?.total_litros ?? 0, 2)} />
        <Kpi label="Total gasto" value={fmtMoney(resumo?.total_gasto ?? 0)} />
        <Kpi label="# Abastecimentos" value={resumo?.total ?? 0} />
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={12} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Nenhum abastecimento.'}</td></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />
    </div>
  );
}

/* ============ TAB: Medições (hodômetro/horímetro) ============ */
function TabMedicoes({ veiculo }) {
  const { rows, meta, loading, busca, setBusca, buscaDebounced, setPage } =
    useServerList('admin.frota.veiculos.medicoes.list', veiculo.id);
  const unidade = veiculo.tipo_hr ? 'hr' : 'km';
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">{veiculo.tipo_hr ? 'Horímetros' : 'Hodômetros'}</h2>
        <BuscaField value={busca} onChange={setBusca} placeholder="Pesquisar data / responsável…" />
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">{buscaDebounced ? `Nada encontrado para "${buscaDebounced}".` : 'Sem medições.'}</td></tr>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacao meta={meta} loading={loading} onPage={setPage} />
    </div>
  );
}

/* ============ Modal: Cadastrar OS Preventiva ============ */
function ModalOsPreventiva({ veiculo, ciclo, medicaoAtual, unidade, fornecedores, onClose }) {
  const proxAutoTarget = ciclo.alvo + ciclo.periodo; // sugere prox alvo = atual+periodo
  const hoje = new Date().toISOString().substring(0, 10);

  const { data, setData, post, processing, errors, reset } = useForm({
    periodo:            ciclo.periodo,
    medicao_proxima:    proxAutoTarget,
    data_de_execucao:   hoje,
    data_conclusao:     '',
    data_de_vencimento: '',
    fornecedor_id:      '',
    nf_pecas:           '',
    nf_mao_obra:        '',
    valor_do_servico:   '',
    valor_da_mao_obra:  '',
    tipo:               '',
    descricao:          '',
    anexo:              null,
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('admin.frota.veiculos.os-preventiva.store', veiculo.id), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => { reset(); onClose(); },
    });
  };

  const totalCalc = (Number(data.valor_do_servico || 0) + Number(data.valor_da_mao_obra || 0))
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Cadastrar OS Preventiva — Ciclo {ciclo.periodo.toLocaleString('pt-BR')} {unidade}</h2>
            <p className="text-sm text-gray-500">{veiculo.prefixo} · medição atual: <strong>{medicaoAtual.toLocaleString('pt-BR')} {unidade}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </header>

        <form onSubmit={submit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3" encType="multipart/form-data">
          <F label={`Próxima medição alvo (${unidade}) *`} name="medicao_proxima" type="number" data={data} setData={setData} errors={errors} />
          <F label="Data de execução *" name="data_de_execucao" type="date" data={data} setData={setData} errors={errors} />
          <F label="Data de conclusão" name="data_conclusao" type="date" data={data} setData={setData} errors={errors} />

          <F label="Fornecedor" name="fornecedor_id" errors={errors}>
            <select value={data.fornecedor_id} onChange={(e) => setData('fornecedor_id', e.target.value)} className={inputCls}>
              <option value="">— selecione —</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
            </select>
          </F>

          <F label="Tipo de serviço" name="tipo" data={data} setData={setData} errors={errors} placeholder="Ex: Troca de óleo" />
          <F label="Vencimento (próxima)" name="data_de_vencimento" type="date" data={data} setData={setData} errors={errors} />

          <F label="NF Peças" name="nf_pecas" data={data} setData={setData} errors={errors} />
          <F label="NF Mão de obra" name="nf_mao_obra" data={data} setData={setData} errors={errors} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Total calculado</label>
            <p className="border border-gray-200 rounded px-3 py-2 bg-gray-50 font-bold">{totalCalc}</p>
          </div>

          <F label="Valor do serviço (R$)" name="valor_do_servico" type="number" step="0.01" data={data} setData={setData} errors={errors} />
          <F label="Valor da mão de obra (R$)" name="valor_da_mao_obra" type="number" step="0.01" data={data} setData={setData} errors={errors} />
          <div></div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Descrição</label>
            <textarea rows={3} value={data.descricao} onChange={(e) => setData('descricao', e.target.value)} className={inputCls} />
            {errors.descricao && <p className="text-red-600 text-xs mt-1">{errors.descricao}</p>}
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Anexo (NF, comprovante)</label>
            <input type="file" onChange={(e) => setData('anexo', e.target.files[0] ?? null)} className="text-sm" accept="image/*,.pdf" />
            <p className="text-xs text-gray-500 mt-1">Arquivo vai pro OneDrive em veiculos/{veiculo.id}/preventivas/</p>
            {errors.anexo && <p className="text-red-600 text-xs mt-1">{errors.anexo}</p>}
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 border-t pt-4 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={processing}
                    className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : 'Cadastrar OS'}
            </button>
          </div>
        </form>
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
