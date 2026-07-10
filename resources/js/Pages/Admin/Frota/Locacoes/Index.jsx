import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';
import { safeLabel } from '@/utils/sanitize';

/**
 * Index das Locações (padrão diário de bordo): 1 linha por veículo mostrando a
 * locação atual. Filtros via GET: busca ao digitar + obra de destino (Select2).
 */
export default function LocacoesIndex({ veiculos, obras = [], filtros = {} }) {
  const { flash } = usePage().props;

  const [search, setSearch] = useState(filtros?.search ?? '');
  const [obraId, setObraId] = useState(filtros?.id_obraDestino ? String(filtros.id_obraDestino) : '');

  const aplicar = (extra = {}) => {
    router.get(route('admin.frota.locacoes.index'),
      { search: search || undefined, id_obraDestino: obraId || undefined, ...extra },
      { preserveState: true, preserveScroll: true });
  };
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setSearch(''); setObraId(''); router.get(route('admin.frota.locacoes.index'), {}, { preserveScroll: true }); };

  const optObras = useMemo(() => obras.map((o) => ({ value: o.id, label: `${o.codigo_obra ? o.codigo_obra + ' — ' : ''}${o.nome_fantasia}` })), [obras]);

  const excluirLocacao = (loc) => {
    if (!loc?.id) return;
    if (!confirm('Remover esta locação?')) return;
    router.delete(route('admin.frota.locacoes.destroy', loc.id), { preserveScroll: true });
  };

  const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
  const agora = new Date().toLocaleString('pt-BR');

  return (
    <AuthenticatedLayout>
      <Head title="Locação de Veículos" />

      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Locação de Veículos</h1>
            <p className="text-sm text-gray-500">Vínculo de veículo a obra/condutor</p>
          </div>
          <Link href={route('admin.frota.locacoes.create')} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Nova locação</Link>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
        {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

        {/* Filtros (GET; busca ao digitar, obra com pesquisa) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (prefixo, placa, marca, modelo…)"
            className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500"
          />
          <SearchableSelect value={obraId} onChange={(v) => { setObraId(v); aplicar({ id_obraDestino: v || undefined }); }} options={optObras} placeholder="Todas as obras de destino" className="min-w-[240px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Veículo</th>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Placa/Série</th>
                <th className="px-3 py-2 text-center">Origem</th>
                <th className="px-3 py-2 text-center">Destino</th>
                <th className="px-3 py-2">Operador</th>
                <th className="px-3 py-2 text-center">Início</th>
                <th className="px-3 py-2 text-center">Término</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {veiculos.data.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-8">Nenhum veículo encontrado.</td></tr>
              ) : veiculos.data.map((v) => {
                const loc = v.locacao_atual;
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="inline-block px-2.5 py-1 rounded-md border bg-gray-50 font-semibold text-rise-700">{v.prefixo ?? 'Sem prefixo'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{v.marca ?? 'Sem reg.'}</div>
                      <div className="text-gray-500 text-xs">{v.modelo ?? v.veiculo ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2">{v.placa ?? v.nun_serie_chassi ?? <span className="text-gray-400">Sem reg.</span>}</td>
                    <td className="px-3 py-2 text-center">
                      {loc?.obra_origem?.codigo_obra
                        ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs font-semibold">{loc.obra_origem.codigo_obra}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {loc?.obra_destino?.codigo_obra
                        ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-semibold">{loc.obra_destino.codigo_obra}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2">{loc?.funcionario_destino?.nome ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{fmtData(loc?.data_inicio)}</td>
                    <td className="px-3 py-2 text-center">
                      {loc?.data_fim
                        ? <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{fmtData(loc.data_fim)}</span>
                        : loc
                          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Em andamento</span>
                          : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                      <Link href={route('admin.frota.locacoes.show', v.id)} title="Histórico de locações"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Detalhes</Link>
                      {loc && (
                        <>
                          <Link href={route('admin.frota.locacoes.edit', loc.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition">Editar</Link>
                          <button onClick={() => excluirLocacao(loc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {veiculos.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {veiculos.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                className={`px-3 py-1 rounded text-sm ${link.active ? 'bg-rise-600 text-white' : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'}`}
                dangerouslySetInnerHTML={safeLabel(link.label)} />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
