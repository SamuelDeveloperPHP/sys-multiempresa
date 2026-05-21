import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ChecklistForm({ checklist, veiculos }) {
  const editando = !!checklist?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    nome_checklist: checklist?.nome_checklist ?? '',
    id_veiculo: checklist?.id_veiculo ?? '',
    situacao: checklist?.situacao ?? 'Ativo',
  });

  const submit = (e) => {
    e.preventDefault();
    editando ? put(route('admin.frota.checklists.update', checklist.id))
             : post(route('admin.frota.checklists.store'));
  };

  return (
    <AuthenticatedLayout>
      <Head title={editando ? `Editar: ${checklist.nome_checklist}` : 'Novo modelo de checklist'} />
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{editando ? 'Editar modelo' : 'Novo modelo de checklist'}</h1>
          <Link href={route('admin.frota.checklists.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Nome do checklist *</label>
            <input value={data.nome_checklist} onChange={(e) => setData('nome_checklist', e.target.value)}
                   className="w-full border border-gray-300 rounded px-3 py-2" />
            {errors.nome_checklist && <p className="text-red-600 text-sm mt-1">{errors.nome_checklist}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Veículo</label>
            <select value={data.id_veiculo} onChange={(e) => setData('id_veiculo', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">— modelo genérico —</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>{v.prefixo} {v.placa ? `(${v.placa})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Situação</label>
            <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <Link href={route('admin.frota.checklists.index')} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</Link>
            <button type="submit" disabled={processing}
                    className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>

        {editando && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              Cadastre os <Link href={route('admin.frota.checklists.itens.index', checklist.id)}
                className="font-semibold underline">itens deste checklist</Link> (perguntas/verificações).
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
