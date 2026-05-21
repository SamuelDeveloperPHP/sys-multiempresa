import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function LocacaoForm({ locacao, veiculos, obras, funcionarios }) {
  const editando = !!locacao?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    veiculo_id: locacao?.veiculo_id ?? '',
    id_obra: locacao?.id_obra ?? '',
    id_obraDestino: locacao?.id_obraDestino ?? '',
    id_funcionario: locacao?.id_funcionario ?? '',
    id_funcionario_destino: locacao?.id_funcionario_destino ?? '',
    tipo_veiculo: locacao?.tipo_veiculo ?? '',
    data_inicio: locacao?.data_inicio?.substring(0,10) ?? '',
    data_prevista: locacao?.data_prevista?.substring(0,10) ?? '',
    data_fim: locacao?.data_fim?.substring(0,10) ?? '',
  });

  const submit = (e) => {
    e.preventDefault();
    editando ? put(route('admin.frota.locacoes.update', locacao.id))
             : post(route('admin.frota.locacoes.store'));
  };

  const F = ({ label, name, children, type = 'text' }) => (
    <div className="mb-3">
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children ?? (
        <input type={type} value={data[name]} onChange={(e) => setData(name, e.target.value)}
               className="w-full border border-gray-300 rounded px-3 py-2" />
      )}
      {errors[name] && <p className="text-red-600 text-sm mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <AuthenticatedLayout>
      <Head title={editando ? 'Editar locação' : 'Nova locação'} />
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{editando ? 'Editar locação' : 'Nova locação de veículo'}</h1>
          <Link href={route('admin.frota.locacoes.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Veículo *" name="veiculo_id">
              <select value={data.veiculo_id} onChange={(e) => setData('veiculo_id', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">— selecione —</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.prefixo} {v.placa ? `(${v.placa})` : ''}</option>
                ))}
              </select>
            </F>

            <F label="Tipo de veículo" name="tipo_veiculo" />

            <F label="Obra origem" name="id_obra">
              <select value={data.id_obra} onChange={(e) => setData('id_obra', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">—</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
              </select>
            </F>

            <F label="Obra destino" name="id_obraDestino">
              <select value={data.id_obraDestino} onChange={(e) => setData('id_obraDestino', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">—</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
              </select>
            </F>

            <F label="Funcionário origem" name="id_funcionario">
              <select value={data.id_funcionario} onChange={(e) => setData('id_funcionario', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">—</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </F>

            <F label="Funcionário destino" name="id_funcionario_destino">
              <select value={data.id_funcionario_destino} onChange={(e) => setData('id_funcionario_destino', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">—</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </F>

            <F label="Data início" name="data_inicio" type="date" />
            <F label="Data prevista de devolução" name="data_prevista" type="date" />
            <F label="Data fim (encerramento)" name="data_fim" type="date" />
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <Link href={route('admin.frota.locacoes.index')} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</Link>
            <button type="submit" disabled={processing}
                    className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
