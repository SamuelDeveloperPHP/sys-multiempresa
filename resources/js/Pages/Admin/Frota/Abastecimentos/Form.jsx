import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function AbastecimentoForm({ abastecimento, veiculos, obras, funcionarios }) {
  const editando = !!abastecimento?.id;

  const { data, setData, post, put, processing, errors } = useForm({
    veiculo_id: abastecimento?.veiculo_id ?? '',
    id_obra: abastecimento?.id_obra ?? '',
    id_funcionario: abastecimento?.id_funcionario ?? '',
    data_abastecimento: abastecimento?.data_abastecimento?.replace(' ', 'T').substring(0, 16) ?? new Date().toISOString().substring(0, 16),
    km_anterior: abastecimento?.km_anterior ?? '',
    km_atual: abastecimento?.km_atual ?? '',
    hr_anterior: abastecimento?.hr_anterior ?? '',
    hr_atual: abastecimento?.hr_atual ?? '',
    fornecedor: abastecimento?.fornecedor ?? '',
    combustivel: abastecimento?.combustivel ?? '',
    tipo: abastecimento?.tipo ?? '',
    quantidade: abastecimento?.quantidade ?? '',
    valor_do_litro: abastecimento?.valor_do_litro ?? '',
    valor_total: abastecimento?.valor_total ?? '',
    arquivo_app: abastecimento?.arquivo_app ?? '',
  });

  // Total = quantidade * valor_do_litro (auto)
  useEffect(() => {
    const q = parseFloat(data.quantidade) || 0;
    const v = parseFloat(data.valor_do_litro) || 0;
    setData('valor_total', (q * v).toFixed(2));
  }, [data.quantidade, data.valor_do_litro]);

  const submit = (e) => {
    e.preventDefault();
    editando ? put(route('admin.frota.abastecimentos.update', abastecimento.id))
             : post(route('admin.frota.abastecimentos.store'));
  };

  const F = ({ label, name, type = 'text', step, min }) => (
    <div className="mb-3">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input type={type} step={step} min={min}
             value={data[name]} onChange={(e) => setData(name, e.target.value)}
             className="w-full border border-gray-300 rounded px-3 py-2" />
      {errors[name] && <p className="text-red-600 text-sm mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <AuthenticatedLayout>
      <Head title={editando ? 'Editar abastecimento' : 'Novo abastecimento'} />
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{editando ? 'Editar abastecimento' : 'Novo abastecimento'}</h1>
          <Link href={route('admin.frota.abastecimentos.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">Veículo *</label>
              <select value={data.veiculo_id} onChange={(e) => setData('veiculo_id', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">— selecione —</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>{v.prefixo} {v.placa ? `(${v.placa})` : ''}</option>
                ))}
              </select>
              {errors.veiculo_id && <p className="text-red-600 text-sm mt-1">{errors.veiculo_id}</p>}
            </div>

            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">Obra</label>
              <select value={data.id_obra} onChange={(e) => setData('id_obra', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">—</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">Funcionário (motorista)</label>
              <select value={data.id_funcionario} onChange={(e) => setData('id_funcionario', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">—</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <F label="Data e hora *" name="data_abastecimento" type="datetime-local" />

            <F label="Fornecedor" name="fornecedor" />
            <F label="Combustível" name="combustivel" />
            <F label="Tipo" name="tipo" />
            <F label="Quantidade (L) *" name="quantidade" type="number" step="0.01" min="0" />
            <F label="Valor por litro (R$) *" name="valor_do_litro" type="number" step="0.0001" min="0" />
            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1">Total (R$)</label>
              <input value={data.valor_total} readOnly
                     className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 font-bold" />
            </div>

            <F label="Km anterior" name="km_anterior" type="number" min="0" />
            <F label="Km atual" name="km_atual" type="number" min="0" />
            <F label="Horímetro anterior" name="hr_anterior" type="number" min="0" />
            <F label="Horímetro atual" name="hr_atual" type="number" min="0" />
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <Link href={route('admin.frota.abastecimentos.index')} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</Link>
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
