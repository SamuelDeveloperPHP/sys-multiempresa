import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { safeHtml } from '@/utils/sanitize';

const fmtMoney = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
const fmtNum   = (v) => v != null ? Number(v).toLocaleString('pt-BR') : '0';
const fmtData  = (d) => d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR') : '—';

export default function HistoricoMnt({
  veiculo,
  corretivas = [],
  preventivas_por_ciclo: preventivasPorCiclo = [],
  timeline = [],
  unidade = 'km',
  total_corretivas: totalCorretivas = 0,
  total_preventivas: totalPreventivas = 0,
  qtd_corretivas: qtdCorretivas = 0,
  qtd_preventivas: qtdPreventivas = 0,
  fornecedores = [],
  filtros = {},
}) {
  const [f, setF] = useState({
    data_inicio:   filtros?.data_inicio   || '',
    data_fim:      filtros?.data_fim      || '',
    fornecedor_id: filtros?.fornecedor_id || '',
    q:             filtros?.q             || '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.veiculos.historico-mnt', veiculo.id), f, {
      preserveState: true, preserveScroll: true,
    });
  };

  const limpar = () => {
    setF({ data_inicio: '', data_fim: '', fornecedor_id: '', q: '' });
    router.get(route('admin.frota.veiculos.historico-mnt', veiculo.id));
  };

  const totalGeral = Number(totalCorretivas) + Number(totalPreventivas);

  return (
    <AuthenticatedLayout>
      <Head title={`Caderno Histórico — ${veiculo.prefixo}`} />

      <div className="p-6 w-full">
        {/* Header (esconde no print) */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Caderno Geral de Manutenção</h1>
            <p className="text-sm text-gray-500">
              Histórico completo de serviços preventivos e corretivos do veículo.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-rise-600 text-white rounded-md hover:bg-rise-700 text-sm font-medium">
              <i className="fa-solid fa-print" /> Imprimir / Salvar PDF
            </button>
            <Link href={route('admin.frota.veiculos.show', veiculo.id)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium border border-gray-200">
              <i className="fa-solid fa-arrow-left" /> Voltar ao veículo
            </Link>
          </div>
        </div>

        {/* Logos para impressão e identidade visual */}
        <div className="flex justify-center items-center gap-6 mb-4 print-logos">
          <img src="https://sga-engeativos.com.br/assets/images/logos/LogoMarcaHorizontal.png"
               alt="SGA Engeativos" className="h-16 object-contain" />
          <img src="https://sga-engeativos.com.br/build/images/icones/logo_LEC.png"
               alt="LEC" className="h-16 object-contain" />
        </div>

        {/* Cabeçalho do veículo (sem borda para print) */}
        <div className="bg-white rounded-lg p-5 mb-4 shadow-sm print-no-shadow border-t-4 border-rise-600">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block px-3 py-1 bg-rise-600 text-white text-xs font-bold uppercase rounded">Veículo / Máquina</span>
            <span className="text-sm text-gray-600">Prefixo: <strong className="text-gray-900">{veiculo.prefixo}</strong></span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Info label="Marca / Modelo" value={`${veiculo.marca ?? '—'} / ${veiculo.modelo ?? '—'}`} />
            <Info label="Ano" value={veiculo.ano ?? '—'} />
            <Info label="Placa / Chassi" value={`${veiculo.placa ?? '—'} / ${veiculo.nun_serie_chassi ?? '—'}`} />
            <Info label="Unidade de medida" value={veiculo.tipo_hr ? 'Horímetro (Hr)' : 'Quilometragem (Km)'} />
          </div>
        </div>

        {/* Filtros (esconde no print) */}
        <form onSubmit={aplicar} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm no-print">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Data início</label>
              <input type="date" value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rise-500 focus:border-rise-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Data fim</label>
              <input type="date" value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rise-500 focus:border-rise-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fornecedor</label>
              <select value={f.fornecedor_id} onChange={(e) => setF({ ...f, fornecedor_id: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rise-500 focus:border-rise-500">
                <option value="">— Todos —</option>
                {fornecedores.map((fr) => <option key={fr.id} value={fr.id}>{fr.nome_fantasia}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Buscar texto</label>
              <input type="text" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })}
                     placeholder="Descrição da corretiva..."
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rise-500 focus:border-rise-500" />
            </div>
            <div className="flex gap-2 items-end">
              <button type="submit" className="flex-1 px-3 py-2 bg-rise-600 text-white rounded-md hover:bg-rise-700 text-sm font-medium">
                <i className="fa-solid fa-filter mr-1" /> Filtrar
              </button>
              <button type="button" onClick={limpar} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm border border-gray-200">
                Limpar
              </button>
            </div>
          </div>
        </form>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Kpi label="Corretivas" value={qtdCorretivas} cor="bg-red-50 border-red-200 text-red-700" icone="fa-wrench" />
          <Kpi label="Preventivas" value={qtdPreventivas} cor="bg-green-50 border-green-200 text-green-700" icone="fa-shield-halved" />
          <Kpi label="Custo corretivas" value={fmtMoney(totalCorretivas)} cor="bg-red-50 border-red-200 text-red-700" icone="fa-coins" />
          <Kpi label="Custo preventivas" value={fmtMoney(totalPreventivas)} cor="bg-green-50 border-green-200 text-green-700" icone="fa-coins" />
          <Kpi label="Total geral" value={fmtMoney(totalGeral)} cor="bg-rise-50 border-rise-200 text-rise-700" icone="fa-money-bill-trend-up" big />
        </div>

        {/* Linha do tempo cronológica (sem borda para print) */}
        <div className="bg-white rounded-lg shadow-sm print-no-shadow mb-4 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <i className="fa-solid fa-timeline text-rise-600" />
            <h3 className="font-semibold text-gray-800">Linha do tempo cronológica</h3>
            <span className="text-xs text-gray-500 ml-auto">{timeline.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-rise-50 text-rise-700">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold w-32">Data conclusão</th>
                  <th className="px-4 py-2 text-left font-semibold w-28">Tipo</th>
                  <th className="px-4 py-2 text-right font-semibold w-28">Leitura ({unidade})</th>
                  <th className="px-4 py-2 text-left font-semibold">Responsável</th>
                  <th className="px-4 py-2 text-left font-semibold">Serviço / descrição</th>
                  <th className="px-4 py-2 text-right font-semibold w-32">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {timeline.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum registro localizado.</td></tr>
                ) : timeline.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{fmtData(t.data)}</td>
                    <td className="px-4 py-2">
                      {t.tipo === 'Preventiva'
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"><i className="fa-solid fa-shield-halved" /> Preventiva</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"><i className="fa-solid fa-wrench" /> Corretiva</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{fmtNum(t.km_hr)}</td>
                    <td className="px-4 py-2 truncate max-w-xs">{t.responsavel}</td>
                    <td className="px-4 py-2 truncate max-w-md">{t.descricao || '—'}</td>
                    <td className="px-4 py-2 text-right font-bold">{fmtMoney(t.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page break para impressão */}
        <div className="page-break" />

        {/* Grid 2 colunas: Preventivas (esq) + Corretivas (dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ============ COLUNA ESQUERDA: PREVENTIVAS POR CICLO ============ */}
          <div className="bg-white border-t-4 border-green-500 rounded-lg shadow-sm print-no-shadow overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-green-700" />
              <h3 className="font-semibold text-green-800">Itens Preventivos Realizados</h3>
              <span className="text-xs text-green-700 ml-auto">{qtdPreventivas} OS</span>
            </div>

            {preventivasPorCiclo.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">Nenhum serviço preventivo registrado.</div>
            ) : preventivasPorCiclo.map((grupo) => (
              <div key={grupo.ciclo}>
                <div className="px-4 py-2 bg-gray-50 border-b border-t border-gray-200 sticky top-0 z-10">
                  <span className="font-bold text-rise-700 text-sm flex items-center gap-2">
                    <i className="fa-solid fa-screwdriver-wrench" />
                    Serviços do Ciclo {fmtNum(grupo.ciclo)} {unidade}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/60 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Data</th>
                      <th className="px-3 py-2 text-right text-gray-600 font-semibold">Medição</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Plano / Serviço</th>
                      <th className="px-3 py-2 text-right text-gray-600 font-semibold">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grupo.itens.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{fmtData(item.data)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtNum(item.medicao)}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">{item.nome_preventiva}</div>
                          {item.motorista && <div className="text-xs text-gray-500">Mot.: {item.motorista}</div>}
                          {(item.nf_pecas || item.nf_mao_obra) && (
                            <div className="text-xs text-gray-500">
                              {item.nf_pecas && <span>NF peças: {item.nf_pecas}</span>}
                              {item.nf_pecas && item.nf_mao_obra && <span> · </span>}
                              {item.nf_mao_obra && <span>NF MO: {item.nf_mao_obra}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-700">{fmtMoney(item.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* ============ COLUNA DIREITA: CORRETIVAS (timeline + HTML) ============ */}
          <div className="bg-white border-t-4 border-red-500 rounded-lg shadow-sm print-no-shadow overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center gap-2">
              <i className="fa-solid fa-wrench text-red-700" />
              <h3 className="font-semibold text-red-800">Detalhe das Corretivas</h3>
              <span className="text-xs text-red-700 ml-auto">{qtdCorretivas} registros</span>
            </div>

            {/* Sem scroll vertical — tudo expandido para impressão */}
            <div className="divide-y divide-gray-100">
              {corretivas.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">Nenhuma corretiva no período.</div>
              ) : corretivas.map((c) => (
                <div key={c.id} className="p-4 hover:bg-gray-50 relative">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          <i className="fa-solid fa-wrench" /> Corretiva
                        </span>
                        <span className="text-sm font-bold text-gray-800">{fmtData(c.data)}</span>
                        {c.medicao != null && (
                          <span className="text-xs text-gray-500 font-mono">@ {fmtNum(c.medicao)} {unidade}</span>
                        )}
                        {c.tem_anexo && (
                          <a href={route('admin.frota.anexos.view', ['manutencao', c.id])}
                             target="_blank" rel="noreferrer"
                             className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100">
                            <i className="fa-solid fa-paperclip" /> Anexo
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <i className="fa-regular fa-building mr-1" />
                        {c.fornecedor || 'Próprio/Interno'}
                        {c.tipo && <span> · {c.tipo}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-red-700">{fmtMoney(c.valor)}</span>
                    </div>
                  </div>

                  {/* Descrição em HTML do nicEdit */}
                  {c.descricao_html && (
                    <div className="prose prose-sm max-w-none text-sm text-gray-700 mt-2 p-3 bg-gray-50 border border-gray-200 rounded"
                         dangerouslySetInnerHTML={safeHtml(c.descricao_html)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impressão e prose */}
      <style>{`
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, header, footer, .no-print { display: none !important; }
          /* Logos sempre visíveis no print */
          .print-logos { display: flex !important; }
          /* Tira todas as sombras e bordas extras */
          .shadow-sm, .shadow, .shadow-md, .print-no-shadow { box-shadow: none !important; }
          /* Page break controlado */
          .page-break { page-break-before: always; }
          /* Tabelas mais compactas */
          table { font-size: 10.5px; page-break-inside: avoid; }
          /* Cards/blocos não quebram no meio */
          .grid > div { page-break-inside: avoid; }
          /* Itens de corretiva podem quebrar entre si mas não no meio */
          .divide-y > div { page-break-inside: avoid; }
        }
        .prose p { margin: 0.25rem 0; }
        .prose ul, .prose ol { margin: 0.25rem 0; padding-left: 1.25rem; }
        .prose strong { color: #1f2937; font-weight: 600; }
        .prose a { color: #557bbb; text-decoration: underline; }
        .prose img { max-width: 100%; height: auto; }
        .prose h1, .prose h2, .prose h3 { font-weight: 700; margin: 0.5rem 0 0.25rem; }
        .prose table { width: 100%; border-collapse: collapse; }
        .prose td, .prose th { border: 1px solid #d1d5db; padding: 4px 8px; }
      `}</style>
    </AuthenticatedLayout>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value || '—'}</p>
    </div>
  );
}

function Kpi({ label, value, cor, icone, big = false }) {
  return (
    <div className={`rounded-lg border p-3 ${cor}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-semibold opacity-80">{label}</p>
        {icone && <i className={`fa-solid ${icone} opacity-60`} />}
      </div>
      <p className={`font-bold mt-1 ${big ? 'text-xl' : 'text-lg'}`}>{value}</p>
    </div>
  );
}
