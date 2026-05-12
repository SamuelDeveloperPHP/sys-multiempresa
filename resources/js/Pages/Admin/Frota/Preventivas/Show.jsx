import { Head, Link } from '@inertiajs/react';

const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtMoney = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PreventivaShow({ preventiva, historico }) {
  return (
    <>
      <Head title={preventiva.nome_preventiva} />
      <div className="p-6 max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{preventiva.nome_preventiva}</h1>
          <p className="text-gray-600">
            {preventiva.veiculo?.prefixo} {preventiva.veiculo?.placa && `(${preventiva.veiculo.placa})`}
          </p>
          <Link href={route('admin.frota.preventivas.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Info label="Tipo" value={preventiva.tipo ?? '—'} />
          <Info label="Período" value={preventiva.periodo ?? '—'} />
          <Info label="Situação" value={preventiva.situacao ?? '—'} />
          <Info label="Total de execuções" value={historico.length} />
        </div>

        <h2 className="text-xl font-bold mb-3">Histórico de execuções</h2>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Data execução</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Km</th>
                <th className="px-4 py-3 text-right">Hr</th>
                <th className="px-4 py-3 text-right">Total NF peças</th>
                <th className="px-4 py-3 text-right">Total mão obra</th>
                <th className="px-4 py-3 text-right">Total geral</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {historico.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-8">Nenhuma execução registrada.</td></tr>
              ) : historico.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{fmtData(h.data_de_execucao)}</td>
                  <td className="px-4 py-3">{h.tipo ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{h.quilometragem_atual ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{h.horimetro_atual ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(h.valor_do_servico)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(h.valor_da_mao_obra)}</td>
                  <td className="px-4 py-3 text-right font-bold">{fmtMoney(h.total_valor_servico)}</td>
                  <td className="px-4 py-3 text-xs">{h.status_realizado ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-white rounded border p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="font-semibold mt-1">{value}</p>
    </div>
  );
}
