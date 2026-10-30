import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  : '—';

const formatNumber = (value) => value == null
  ? '—'
  : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export default function ChecklistExecucaoShow({ execucao }) {
  const respostas = Array.isArray(execucao.respostas) ? execucao.respostas : [];
  const conformes = respostas.filter((resposta) => resposta.ok === true).length;
  const naoConformes = respostas.filter((resposta) => resposta.ok === false).length;
  const identificacao = execucao.veiculo?.prefixo || execucao.veiculo?.placa || `#${execucao.veiculo_id}`;

  return (
    <AuthenticatedLayout>
      <Head title={`Checklist ${identificacao}`} />

      <main className="w-full p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href={route('admin.frota.checklist-execucoes.index')}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rise-700"
          >
            <span aria-hidden="true">←</span> Voltar aos checklists
          </Link>

          <header className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-gray-200 bg-slate-50 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Concluído
                  </span>
                  <span className="text-sm text-gray-500">Execução #{execucao.id}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {execucao.template_nome || execucao.checklist?.nome_checklist || 'Checklist de veículo'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {identificacao} · {execucao.veiculo?.marca} {execucao.veiculo?.modelo}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500">Executado em</p>
                <p className="text-lg font-semibold text-gray-900">{formatDateTime(execucao.data_execucao)}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-4">
              <Metric label="Responsável" value={execucao.responsavel || execucao.user?.name || '—'} />
              <Metric label="Obra" value={execucao.obra?.nome_fantasia || '—'} />
              <Metric label="Quilometragem" value={formatNumber(execucao.km_atual)} />
              <Metric label="Horímetro" value={formatNumber(execucao.hr_atual)} />
            </dl>
          </header>

          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Itens inspecionados</h2>
                  <p className="text-sm text-gray-500">Respostas e evidências registradas no campo</p>
                </div>
                <span className="text-sm font-medium text-gray-600">{respostas.length} itens</span>
              </div>

              {respostas.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-500">Esta execução não possui respostas vinculadas.</p>
              ) : (
                <ol className="divide-y divide-gray-100">
                  {respostas.map((resposta, index) => (
                    <li key={`${resposta.item_id ?? 'item'}-${index}`} className="grid gap-3 px-5 py-4 md:grid-cols-[28px_minmax(0,1fr)_auto]">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${resposta.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {resposta.ok ? '✓' : '!'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{resposta.item_nome || 'Item sem identificação'}</p>
                        {resposta.obs && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{resposta.obs}</p>}
                        {resposta.foto_url && (
                          <a href={resposta.foto_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                            <img src={resposta.foto_url} alt={`Evidência de ${resposta.item_nome || 'item do checklist'}`} className="h-24 w-32 rounded-lg border border-gray-200 object-cover" />
                          </a>
                        )}
                      </div>
                      <span className={`h-fit rounded-md px-2.5 py-1 text-xs font-semibold ${resposta.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {resposta.ok ? 'Conforme' : 'Não conforme'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-900">Resultado</h2>
                <div className="mt-4 space-y-3">
                  <Result label="Conformes" value={conformes} color="emerald" />
                  <Result label="Não conformes" value={naoConformes} color="red" />
                </div>
              </div>

              {execucao.observacao_geral && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h2 className="font-semibold text-amber-900">Observação geral</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-900">{execucao.observacao_geral}</p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function Result({ label, value, color }) {
  const styles = color === 'red'
    ? 'bg-red-50 text-red-800 border-red-100'
    : 'bg-emerald-50 text-emerald-800 border-emerald-100';

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${styles}`}>
      <span className="text-sm font-medium">{label}</span>
      <strong className="text-xl">{value}</strong>
    </div>
  );
}
