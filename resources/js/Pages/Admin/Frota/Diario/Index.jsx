import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';

/**
 * Admin/Frota/Diario/Index — painel do gerente (read-only).
 * Duas listas do dia (Realizados / Pendentes) por veículo + histórico de 7
 * dias corridos (ciclo Aberto/Encerrado). O preenchimento em campo é do PWA.
 */
export default function DiarioIndex({ dias = [], realizados = [], pendentes = [], kpis = {}, obras = [], filtros = {}, agora = '' }) {
  const [busca, setBusca] = useState(filtros.q ?? '');
  const [obraId, setObraId] = useState(filtros.obra_id ? String(filtros.obra_id) : '');
  const [ciclo, setCiclo] = useState(filtros.ciclo_status ?? '');

  const aplicar = (extra = {}) => {
    router.get(route('admin.frota.diario.index'), {
      q: busca || undefined,
      obra_id: obraId || undefined,
      ciclo_status: ciclo || undefined,
      ...extra,
    }, { preserveState: true, preserveScroll: true });
  };
  // Busca conforme digita (GET com debounce) — sem botão "Filtrar".
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => {
    setBusca(''); setObraId(''); setCiclo('');
    router.get(route('admin.frota.diario.index'), {}, { preserveScroll: true });
  };

  const optObras = useMemo(() => obras.map((o) => ({ value: o.id, label: `${o.code ? o.code + ' — ' : ''}${o.nome_fantasia}` })), [obras]);
  const optCiclos = [{ value: 'ABERTO', label: 'Aberto' }, { value: 'ENCERRADO', label: 'Encerrado' }];

  const fmtDia = (ds) => `${ds.slice(8, 10)}/${ds.slice(5, 7)}`;

  return (
    <AuthenticatedLayout>
      <Head title="Diário de bordo" />

      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Diário de bordo</h1>
          <div className="flex items-center gap-3 text-sm">
            <Link href={route('admin.frota.checklist-execucoes.index')} className="text-gray-600 hover:underline">Checklists preenchidos →</Link>
            <span className="text-gray-400">Registros enviados pelo app mobile</span>
          </div>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Kpi label="Total de veículos" value={kpis.total ?? 0} />
          <Kpi label="Realizados hoje" value={kpis.realizados_hoje ?? 0} cor="text-green-600" />
          <Kpi label="Pendentes hoje" value={kpis.pendentes_hoje ?? 0} cor="text-amber-600" />
          <Kpi label="% Cumprimento" value={`${kpis.cumprimento ?? 0}%`} cor="text-rise-700" />
        </div>

        {/* Filtros (todos via GET; busca conforme digita, selects com pesquisa) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Placa / Prefixo / Modelo / Marca (busca ao digitar)"
            className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500"
          />
          <SearchableSelect value={obraId} onChange={(v) => { setObraId(v); aplicar({ obra_id: v || undefined }); }} options={optObras} placeholder="Todas as obras" className="min-w-[220px]" />
          <SearchableSelect value={ciclo} onChange={(v) => { setCiclo(v); aplicar({ ciclo_status: v || undefined }); }} options={optCiclos} placeholder="Todos os ciclos" className="min-w-[170px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        <Lista
          titulo="Diários realizados hoje" icone="✓"
          corTitulo="text-green-700" corHead="bg-green-50 text-green-900"
          linhas={realizados} dias={dias} fmtDia={fmtDia}
          vazio="Nenhum diário realizado hoje ainda."
        />

        <div className="h-6" />

        <Lista
          titulo="Pendentes hoje" icone="!"
          corTitulo="text-amber-700" corHead="bg-amber-50 text-amber-900"
          linhas={pendentes} dias={dias} fmtDia={fmtDia}
          vazio="Nenhum veículo pendente — todos preencheram hoje 🎉"
        />
      </div>
    </AuthenticatedLayout>
  );
}

function Kpi({ label, value, cor = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-lg border p-4 text-center">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${cor}`}>{value}</p>
    </div>
  );
}

function Lista({ titulo, icone, corTitulo, corHead, linhas, dias, fmtDia, vazio }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <span className={`font-semibold ${corTitulo}`}>{icone} {titulo}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{linhas.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`text-left ${corHead}`}>
            <tr>
              <th className="px-3 py-2">Prefixo</th>
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Placa / Chassi</th>
              {dias.map((d) => <th key={d} className="px-3 py-2 text-center whitespace-nowrap">{fmtDia(d)}</th>)}
              <th className="px-3 py-2">Cadastrado por</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {linhas.length === 0 ? (
              <tr><td colSpan={5 + dias.length} className="text-center text-gray-400 py-6">{vazio}</td></tr>
            ) : linhas.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold text-rise-700">{l.prefixo || '—'}</td>
                <td className="px-3 py-2">{l.veiculo}</td>
                <td className="px-3 py-2 text-gray-600">{l.placa_chassi}</td>
                {l.dias.map((c, i) => (
                  <td key={i} className="px-3 py-2 text-center">
                    {c === 'encerrado'
                      ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Encerrado</span>
                      : c === 'aberto'
                        ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Aberto</span>
                        : <span className="text-gray-300">–</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-gray-600 text-xs">{l.cadastrado_por ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={route('admin.frota.veiculos.show', l.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100">Detalhes</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
