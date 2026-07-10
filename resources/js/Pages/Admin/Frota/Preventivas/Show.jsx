import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtMoney = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SITUACAO = {
  1: '⚫ Obrigatória',
  2: '◉ Executar conforme condição',
  3: '▲ Conferir / Verificar',
};
const TIPO = { km: 'Quilômetros', hr: 'Horas', tmp: 'Meses' };

export default function PreventivaShow({ preventiva, historico }) {
  const itens = preventiva.itens ?? [];
  return (
    <AuthenticatedLayout>
      <Head title={preventiva.nome_preventiva} />
      <div className="p-6 w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{preventiva.nome_preventiva}</h1>
          <p className="text-gray-600">
            {preventiva.veiculo?.prefixo} {preventiva.veiculo?.placa && `(${preventiva.veiculo.placa})`}
          </p>
          <Link href={route('admin.frota.preventivas.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Info label="Situação do plano" value={preventiva.situacao ?? '—'} />
          <Info label="Serviços" value={itens.length} />
          <Info label="Total de execuções" value={historico.length} />
        </div>

        <h2 className="text-xl font-bold mb-3">Serviços do plano</h2>
        <div className="bg-white rounded-lg shadow border overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Período</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Alerta período</th>
                <th className="px-4 py-3 text-right">Mêses</th>
                <th className="px-4 py-3 text-right">Alerta mês</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 py-8">Nenhum serviço cadastrado neste plano.</td></tr>
              ) : itens.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{it.nome_servico}</td>
                  <td className="px-4 py-3">{SITUACAO[it.situacao] ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{it.periodo_maq_vei ?? '—'}</td>
                  <td className="px-4 py-3">{TIPO[it.tipo_itens] ?? it.tipo_itens ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{it.alerta_venci ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{it.periodo_mes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{it.alert_venc_mes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </AuthenticatedLayout>
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
