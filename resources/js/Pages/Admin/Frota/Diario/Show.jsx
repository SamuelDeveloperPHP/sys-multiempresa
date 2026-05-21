import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmtDT = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

export default function DiarioShow({ diario }) {
  const { flash } = usePage().props;
  const { data, setData, put, processing } = useForm({
    descricao_atividade: diario.descricao_atividade ?? '',
    descricao_encerramento: diario.descricao_encerramento ?? '',
    ciclo_status: diario.ciclo_status,
  });

  const salvar = (e) => {
    e.preventDefault();
    put(route('admin.frota.diario.update', diario.id), { preserveScroll: true });
  };
  const excluir = () => {
    if (!confirm('Remover este diário? Esta ação não pode ser desfeita.')) return;
    router.delete(route('admin.frota.diario.destroy', diario.id));
  };

  return (
    <AuthenticatedLayout>
      <Head title={`Diário #${diario.id}`} />
      <div className="p-6 max-w-4xl mx-auto">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Diário de bordo #{diario.id}</h1>
            <p className="text-gray-600">{diario.veiculo?.prefixo} • {diario.obra?.nome_fantasia ?? '—'}</p>
            <Link href={route('admin.frota.diario.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
          </div>
          <button onClick={excluir} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Info label="Horário inicial" value={fmtDT(diario.horario_inicial)} />
          <Info label="Horário final" value={fmtDT(diario.horario_final)} />
          <Info label="Horímetro inicial" value={diario.hr_anterior ?? '—'} />
          <Info label="Horímetro final" value={diario.hr_atual ?? '—'} />
          <Info label="KM inicial" value={diario.km_anterior ?? '—'} />
          <Info label="KM final" value={diario.km_atual ?? '—'} />
          <Info label="Operador" value={diario.user?.name ?? diario.user_create ?? '—'} />
          <Info label="Status sync" value={`${diario.sync_status} ${diario.sync_error ? '— ' + diario.sync_error : ''}`} />
        </div>

        <form onSubmit={salvar} className="bg-white rounded-lg shadow border p-6 space-y-4">
          <h2 className="font-semibold">Edição administrativa</h2>

          <div>
            <label className="block text-sm font-semibold mb-1">Descrição da atividade</label>
            <textarea rows={4} value={data.descricao_atividade}
                      onChange={(e) => setData('descricao_atividade', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Descrição de encerramento</label>
            <textarea rows={3} value={data.descricao_encerramento}
                      onChange={(e) => setData('descricao_encerramento', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Status do ciclo</label>
            <select value={data.ciclo_status} onChange={(e) => setData('ciclo_status', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2">
              <option value="ABERTO">Aberto</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>

          {diario.arquivo_servidor && (
            <div>
              <p className="text-sm font-semibold mb-1">Foto enviada</p>
              <a href={diario.arquivo_servidor} target="_blank" rel="noopener noreferrer">
                <img src={diario.arquivo_servidor} alt="Foto" className="max-w-md rounded border" />
              </a>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={processing}
                    className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
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
