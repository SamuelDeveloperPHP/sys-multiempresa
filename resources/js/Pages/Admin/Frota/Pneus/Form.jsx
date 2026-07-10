import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const DESENHOS = ['Borrachudo', 'Misto', 'Liso (trativo)', 'Direcional', 'OTR (linha amarela)'];

// Campo em escopo de MÓDULO (não dentro do componente) — se ficasse dentro,
// cada tecla recriaria o componente e remontaria o input (perda de foco).
function Campo({ label, name, type = 'text', step, placeholder, data, setData, errors, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      {children ?? (
        <input type={type} step={step} placeholder={placeholder} value={data[name]}
          onChange={(e) => setData(name, e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
      )}
      {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );
}

export default function PneuForm({ pneu }) {
  const editando = !!pneu?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    numero_fogo:   pneu?.numero_fogo ?? '',
    dot:           pneu?.dot ?? '',
    marca:         pneu?.marca ?? '',
    modelo:        pneu?.modelo ?? '',
    medida:        pneu?.medida ?? '',
    desenho:       pneu?.desenho ?? '',
    tipo:          pneu?.tipo ?? '',
    vida_atual:    pneu?.vida_atual ?? 0,
    valor_compra:  pneu?.valor_compra ?? '',
    data_compra:   pneu?.data_compra?.substring(0, 10) ?? '',
    nota_fiscal:   pneu?.nota_fiscal ?? '',
    sulco_novo_mm: pneu?.sulco_novo_mm ?? '',
  });

  const submit = (e) => {
    e.preventDefault();
    editando ? put(route('admin.frota.pneus.update', pneu.id)) : post(route('admin.frota.pneus.store'));
  };

  const props = { data, setData, errors };

  return (
    <AuthenticatedLayout>
      <Head title={editando ? 'Editar pneu' : 'Novo pneu'} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">{editando ? `Editar pneu ${pneu.numero_fogo}` : 'Novo pneu'}</h1>
          <Link href={route('admin.frota.pneus.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Nº de fogo *" name="numero_fogo" {...props} />
          <Campo label="DOT (semana/ano)" name="dot" {...props} />
          <Campo label="Marca" name="marca" {...props} />
          <Campo label="Modelo" name="modelo" {...props} />
          <Campo label="Medida" name="medida" placeholder="ex.: 295/80 R22.5" {...props} />
          <Campo label="Desenho / banda" name="desenho" {...props}>
            <select value={data.desenho} onChange={(e) => setData('desenho', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">— selecione —</option>
              {DESENHOS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Campo>
          <Campo label="Tipo" name="tipo" {...props}>
            <select value={data.tipo} onChange={(e) => setData('tipo', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">— selecione —</option>
              <option value="radial">Radial</option>
              <option value="diagonal">Diagonal</option>
            </select>
          </Campo>
          <Campo label="Vida atual (0 = novo)" name="vida_atual" type="number" {...props} />
          <Campo label="Valor de compra (R$)" name="valor_compra" type="number" step="0.01" {...props} />
          <Campo label="Data de compra" name="data_compra" type="date" {...props} />
          <Campo label="Nota fiscal" name="nota_fiscal" {...props} />
          <Campo label="Sulco novo (mm)" name="sulco_novo_mm" type="number" step="0.1" {...props} />

          <div className="md:col-span-2 flex gap-2 justify-end mt-2">
            <Link href={route('admin.frota.pneus.index')} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</Link>
            <button type="submit" disabled={processing} className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
