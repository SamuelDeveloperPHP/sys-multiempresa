import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Show da Locação — porta o legacy show.blade.php.
 * Mostra histórico de locações de um veículo com dias em locação,
 * dias em obra (desde data_inicio) e dias em manutenção.
 */
export default function LocacoesShow({ veiculo, locacoes }) {
  const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const diffDias = (ini, fim) => {
    if (!ini) return 0;
    const a = new Date(ini);
    const b = fim ? new Date(fim) : new Date();
    return Math.max(0, Math.floor((b - a) / 86400000));
  };

  const excluir = (l) => {
    if (!confirm('Tem certeza que deseja excluir o registro?')) return;
    router.delete(route('admin.frota.locacoes.destroy', l.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title={`Locações — ${veiculo.prefixo}`} />

      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Locação de Veículos — Detalhes</h1>
            <Link
              href={route('admin.frota.locacoes.index')}
              className="text-sm text-gray-600 hover:underline"
            >
              ← voltar
            </Link>
          </div>
          <Link
            href={route('admin.frota.locacoes.create')}
            className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700"
          >
            + Novo registro
          </Link>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* ============ Card do veículo ============ */}
          <div className="xl:col-span-3 bg-white rounded-lg shadow border overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 border-b">
              Veículo
            </div>
            <div className="p-3">
              <div className="w-full aspect-square bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                <img
                  src={route('admin.frota.veiculos.imagem-principal', veiculo.id)}
                  alt={veiculo.prefixo}
                  className="w-full h-full object-cover"
                />
              </div>
              <dl className="mt-3 text-sm space-y-1">
                <div className="flex justify-between border-b pb-1">
                  <dt className="text-gray-500">Prefixo</dt>
                  <dd className="font-semibold">{veiculo.prefixo ?? '—'}</dd>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <dt className="text-gray-500">Placa/Série</dt>
                  <dd className="font-semibold">{veiculo.placa ?? veiculo.nun_serie_chassi ?? '—'}</dd>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <dt className="text-gray-500">Marca</dt>
                  <dd>{veiculo.marca ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Modelo</dt>
                  <dd>{veiculo.modelo ?? veiculo.veiculo ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ============ Tabela de locações ============ */}
          <div className="xl:col-span-9 bg-white rounded-lg shadow border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                <tr>
                  <th className="px-3 py-3 text-center">Origem</th>
                  <th className="px-3 py-3 text-center">Destino</th>
                  <th className="px-3 py-3">Operador</th>
                  <th className="px-3 py-3 text-center">Início</th>
                  <th className="px-3 py-3 text-center">Término</th>
                  <th className="px-3 py-3 text-center">Em locação</th>
                  <th className="px-3 py-3 text-center">Em obra</th>
                  <th className="px-3 py-3 text-center">Em manutenção</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {locacoes.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-gray-500 py-8">Sem locações para este veículo.</td></tr>
                ) : locacoes.map((l, idx) => {
                  const diasLocacao = diffDias(l.data_inicio, l.data_fim);
                  const diasEmObra  = diffDias(l.data_inicio, null);
                  const diasMnt     = Number(l.dias_em_manutencao ?? 0);

                  const corLoc = diasLocacao > 30
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700';
                  const corMnt = diasMnt > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700';

                  const tooltipMnt = (l.manutencoes ?? [])
                    .map((m) => `(${fmtData(m.data_de_execucao)} – ${fmtData(m.data_conclusao)})`)
                    .join('\n');

                  return (
                    <tr
                      key={l.id}
                      className={idx === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-3 py-3 text-center">
                        {l.obra_origem?.codigo_obra
                          ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs font-semibold">{l.obra_origem.codigo_obra}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {l.obra_destino?.codigo_obra
                          ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-semibold">{l.obra_destino.codigo_obra}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-3">{l.funcionario_destino?.nome ?? '—'}</td>
                      <td className="px-3 py-3 text-center">{fmtData(l.data_inicio)}</td>
                      <td className="px-3 py-3 text-center">
                        {l.data_fim
                          ? fmtData(l.data_fim)
                          : <span className="text-gray-500 text-xs">em andamento</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${corLoc}`}>
                          {diasLocacao} dia(s)
                          {!l.data_fim && <span className="block text-[10px] font-normal">(em andamento)</span>}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs font-semibold">
                          {diasEmObra} dia(s)
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center" title={tooltipMnt || undefined}>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${corMnt}`}>
                          {diasMnt} dia(s)
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap space-x-1">
                        <Link
                          href={route('admin.frota.locacoes.edit', l.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => excluir(l)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
