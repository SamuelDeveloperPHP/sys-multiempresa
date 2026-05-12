import { Head, Link, useForm } from '@inertiajs/react';

export default function PreventivaForm({ preventiva, veiculos }) {
  const editando = !!preventiva?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    nome_preventiva: preventiva?.nome_preventiva ?? '',
    nome_servico: preventiva?.nome_servico ?? '',
    id_veiculo: preventiva?.id_veiculo ?? '',
    tipo_veiculo: preventiva?.tipo_veiculo ?? '',
    tipo: preventiva?.tipo ?? '',
    periodo: preventiva?.periodo ?? '',
    alerta_venci: preventiva?.alerta_venci ?? '',
    situacao: preventiva?.situacao ?? 'Ativo',
  });

  const submit = (e) => {
    e.preventDefault();
    editando ? put(route('admin.frota.preventivas.update', preventiva.id))
             : post(route('admin.frota.preventivas.store'));
  };

  const F = ({ label, name, type = 'text', children }) => (
    <div className="mb-3">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      {children ?? (
        <input type={type} value={data[name]} onChange={(e) => setData(name, e.target.value)}
               className="w-full border border-gray-300 rounded px-3 py-2" />
      )}
      {errors[name] && <p className="text-red-600 text-sm mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      <Head title={editando ? 'Editar preventiva' : 'Nova preventiva'} />
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{editando ? 'Editar preventiva' : 'Nova preventiva'}</h1>
          <Link href={route('admin.frota.preventivas.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Nome da preventiva *" name="nome_preventiva" />
            <F label="Nome do serviço" name="nome_servico" />

            <F label="Veículo" name="id_veiculo">
              <select value={data.id_veiculo} onChange={(e) => setData('id_veiculo', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">— catálogo genérico —</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.prefixo} {v.placa ? `(${v.placa})` : ''}</option>)}
              </select>
            </F>

            <F label="Tipo de veículo" name="tipo_veiculo" />
            <F label="Tipo (km/hora/mês)" name="tipo" />
            <F label="Período" name="periodo" type="number" />
            <F label="Alerta antes do vencimento (dias)" name="alerta_venci" type="number" />

            <F label="Situação" name="situacao">
              <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option>Ativo</option><option>Inativo</option>
              </select>
            </F>
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <Link href={route('admin.frota.preventivas.index')} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</Link>
            <button type="submit" disabled={processing}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
