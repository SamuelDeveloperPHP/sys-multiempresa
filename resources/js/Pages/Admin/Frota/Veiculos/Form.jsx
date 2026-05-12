import { Head, Link, useForm } from '@inertiajs/react';

/**
 * Admin/Frota/Veiculos/Form
 * Tela unica para criar e editar veiculos.
 *
 * Props esperadas:
 *   veiculo: null (criar) | { id, prefixo, placa, ... } (editar)
 *   obras:   [{ id, nome_fantasia, code }, ...]
 */
export default function VeiculoForm({ veiculo, obras }) {
  const editando = !!veiculo?.id;

  const { data, setData, post, put, processing, errors } = useForm({
    obra_id: veiculo?.obra_id ?? '',
    prefixo: veiculo?.prefixo ?? '',
    tipo: veiculo?.tipo ?? '',
    placa: veiculo?.placa ?? '',
    modelo: veiculo?.modelo ?? '',
    marca: veiculo?.marca ?? '',
    ano: veiculo?.ano ?? '',
    tipo_km: !!veiculo?.tipo_km,
    tipo_hr: !!veiculo?.tipo_hr,
    imagem: veiculo?.imagem ?? '',
  });

  const submit = (e) => {
    e.preventDefault();
    if (editando) {
      put(route('admin.frota.veiculos.update', veiculo.id));
    } else {
      post(route('admin.frota.veiculos.store'));
    }
  };

  const Field = ({ label, name, type = 'text', children }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children ?? (
        <input
          type={type}
          value={data[name]}
          onChange={(e) => setData(name, e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      )}
      {errors[name] && <p className="text-red-600 text-sm mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      <Head title={editando ? 'Editar veiculo' : 'Novo veiculo'} />
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">
            {editando ? `Editar veiculo: ${veiculo.prefixo}` : 'Novo veiculo'}
          </h1>
          <Link href={route('admin.frota.veiculos.index')} className="text-sm text-gray-600 hover:underline">
            ← voltar
          </Link>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Prefixo *" name="prefixo" />

            <Field label="Obra" name="obra_id">
              <select
                value={data.obra_id}
                onChange={(e) => setData('obra_id', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">— sem obra —</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome_fantasia} {o.code ? `(${o.code})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Placa" name="placa" />
            <Field label="Tipo (texto)" name="tipo" />
            <Field label="Modelo" name="modelo" />
            <Field label="Marca" name="marca" />
            <Field label="Ano" name="ano" type="number" />
            <Field label="Imagem (caminho)" name="imagem" />
          </div>

          <div className="mt-4 flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.tipo_hr}
                onChange={(e) => setData('tipo_hr', e.target.checked)}
              />
              <span>Horimetro (maquinas, horas trabalhadas)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.tipo_km}
                onChange={(e) => setData('tipo_km', e.target.checked)}
              />
              <span>Hodometro (km rodado)</span>
            </label>
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <Link
              href={route('admin.frota.veiculos.index')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
