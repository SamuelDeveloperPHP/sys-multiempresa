import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { safeLabel } from '@/utils/sanitize';

/**
 * Index das Locações — porta o legacy (1 linha por veículo, exibindo a
 * locacaoAtual). Filtros: busca livre + obra de destino.
 */
export default function LocacoesIndex({ veiculos, obras, filtros }) {
  const { flash } = usePage().props;

  const [f, setF] = useState({
    search:         filtros?.search ?? '',
    id_obraDestino: filtros?.id_obraDestino ?? '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.locacoes.index'), f, {
      preserveState: true, preserveScroll: true,
    });
  };

  const limpar = () => {
    setF({ search: '', id_obraDestino: '' });
    router.get(route('admin.frota.locacoes.index'), {}, { preserveScroll: true });
  };

  const excluirLocacao = (locacao) => {
    if (!locacao?.id) return;
    if (!confirm('Remover esta locação?')) return;
    router.delete(route('admin.frota.locacoes.destroy', locacao.id), { preserveScroll: true });
  };

  const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <AuthenticatedLayout>
      <Head title="Locações de Veículos" />

      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Locação de Veículos</h1>
            <p className="text-sm text-gray-500">Vínculo de veículo a obra/condutor</p>
          </div>
          <Link
            href={route('admin.frota.locacoes.create')}
            className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700"
          >
            + Nova locação
          </Link>
        </header>

        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
        )}
        {flash?.error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>
        )}

        <form onSubmit={aplicar} className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Buscar (prefixo, placa, marca, modelo...)"
            value={f.search}
            onChange={(e) => setF({ ...f, search: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 md:col-span-2"
          />
          <select
            value={f.id_obraDestino}
            onChange={(e) => setF({ ...f, id_obraDestino: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Todas as obras de destino</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo_obra ? `${o.codigo_obra} — ` : ''}{o.nome_fantasia}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-800 text-white rounded flex-1">Filtrar</button>
            <button type="button" onClick={limpar} className="px-4 py-2 border rounded">Limpar</button>
          </div>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3 w-16 text-center">Foto</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Placa/Série</th>
                <th className="px-4 py-3 text-center">Origem</th>
                <th className="px-4 py-3 text-center">Destino</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3 text-center">Início</th>
                <th className="px-4 py-3 text-center">Término</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {veiculos.data.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-500 py-8">Nenhum veículo encontrado.</td></tr>
              ) : veiculos.data.map((v) => {
                const loc = v.locacao_atual; // snake_case por padrão do Inertia/Laravel
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-center">
                      <img
                        src={route('admin.frota.veiculos.imagem-principal', v.id)}
                        alt={v.prefixo}
                        className="w-12 h-12 object-cover rounded border inline-block"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 rounded-md border bg-gray-50 font-semibold text-gray-700">
                        {v.prefixo ?? 'Sem prefixo'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold">{v.marca ?? 'Sem reg.'}</div>
                      <div className="text-gray-500 text-xs">{v.modelo ?? v.veiculo ?? '—'}</div>
                    </td>

                    <td className="px-4 py-3">
                      {v.placa ?? v.nun_serie_chassi ?? <span className="text-gray-400">Sem reg.</span>}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {loc?.obra_origem?.codigo_obra
                        ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs font-semibold">{loc.obra_origem.codigo_obra}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {loc?.obra_destino?.codigo_obra
                        ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-semibold">{loc.obra_destino.codigo_obra}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>

                    <td className="px-4 py-3">
                      {loc?.funcionario_destino?.nome ?? '—'}
                    </td>

                    <td className="px-4 py-3 text-center">{fmtData(loc?.data_inicio)}</td>

                    <td className="px-4 py-3 text-center">
                      {loc?.data_fim
                        ? <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{fmtData(loc.data_fim)}</span>
                        : loc
                          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Em andamento</span>
                          : <span className="text-gray-400">—</span>}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      <Link
                        href={route('admin.frota.locacoes.show', v.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                        title="Histórico de locações"
                      >
                        Detalhes
                      </Link>
                      {loc && (
                        <>
                          <Link
                            href={route('admin.frota.locacoes.edit', loc.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => excluirLocacao(loc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
                          >
                            Excluir
                          </button>
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
              <Link
                key={i}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 rounded text-sm ${
                  link.active
                    ? 'bg-rise-600 text-white'
                    : link.url
                      ? 'bg-white border hover:bg-gray-50'
                      : 'opacity-30 cursor-not-allowed'
                }`}
                dangerouslySetInnerHTML={safeLabel(link.label)}
              />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
