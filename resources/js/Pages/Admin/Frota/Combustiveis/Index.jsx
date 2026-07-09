import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Admin/Frota/Combustiveis/Index
 * CRUD dos combustíveis + fatores de emissão (referência nacional).
 * Fórmula por litro de bomba: fóssil = (1 - %bio) × fator_fossil ;
 * biogênico = %bio × fator_biogenico.
 */
export default function CombustiveisIndex({ combustiveis = [] }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (c) => { setEditando(c); setShowForm(true); };
  const excluir = (c) => {
    if (!confirm(`Remover o combustível "${c.nome}"?`)) return;
    router.delete(route('admin.frota.combustiveis.destroy', c.id), { preserveScroll: true });
  };

  const num = (v, d = 3) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <AuthenticatedLayout>
      <Head title="Combustíveis e fatores de emissão" />

      <div className="p-6 w-full">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Combustíveis e fatores de emissão</h1>
            <Link href={route('admin.frota.veiculos.index')} className="text-sm text-gray-600 hover:underline">← voltar para veículos</Link>
          </div>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo combustível</button>
        </header>

        <div className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
          <strong>Referência:</strong> fatores no padrão do Programa Brasileiro GHG Protocol, separando CO₂ fóssil de biogênico
          e considerando a mistura obrigatória (ANP). Os valores devem ser <strong>revisados anualmente</strong>.
          Fatores são por litro do componente puro; a mistura (% biogênico) é a fração da bomba.
        </div>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Combustível</th>
                <th className="px-3 py-2 text-right">Fator fóssil</th>
                <th className="px-3 py-2 text-right">Fator biogênico</th>
                <th className="px-3 py-2 text-right">% biogênico</th>
                <th className="px-3 py-2 text-right text-rise-700">CO₂ fóssil/L</th>
                <th className="px-3 py-2 text-right text-gray-500">CO₂ bio/L</th>
                <th className="px-3 py-2 text-center">Ativo</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {combustiveis.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-6">Nenhum combustível cadastrado.</td></tr>
              ) : combustiveis.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.ativo ? '' : 'opacity-50'}`}>
                  <td className="px-3 py-2 font-medium text-gray-800">{c.nome}</td>
                  <td className="px-3 py-2 text-right">{num(c.fator_fossil)}</td>
                  <td className="px-3 py-2 text-right">{num(c.fator_biogenico)}</td>
                  <td className="px-3 py-2 text-right">{num(c.perc_biogenico * 100, 0)}%</td>
                  <td className="px-3 py-2 text-right font-semibold text-rise-700">{num(c.co2_fossil_litro)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{num(c.co2_biogenico_litro)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{c.ativo ? 'Sim' : 'Não'}</span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => abrirEdit(c)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(c)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <ModalCombustivel combustivel={editando} onClose={() => setShowForm(false)} />}
    </AuthenticatedLayout>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-rise-500 focus:border-rise-500';

function ModalCombustivel({ combustivel, onClose }) {
  const editando = !!combustivel?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    nome:            combustivel?.nome ?? '',
    fator_fossil:    combustivel?.fator_fossil ?? '',
    fator_biogenico: combustivel?.fator_biogenico ?? '',
    perc_biogenico:  combustivel?.perc_biogenico ?? 0,
    ativo:           combustivel?.ativo ?? true,
    ordem:           combustivel?.ordem ?? 0,
  });

  // Preview por litro de bomba (mesma fórmula do back).
  const percBio = Number(data.perc_biogenico) || 0;
  const co2Fossil = (1 - percBio) * (Number(data.fator_fossil) || 0);
  const co2Bio = percBio * (Number(data.fator_biogenico) || 0);
  const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const submit = (e) => {
    e.preventDefault();
    const opts = { preserveScroll: true, onSuccess: onClose };
    if (editando) put(route('admin.frota.combustiveis.update', combustivel.id), opts);
    else post(route('admin.frota.combustiveis.store'), opts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">{editando ? `Editar: ${combustivel.nome}` : 'Novo combustível'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </header>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
            <input value={data.nome} onChange={(e) => setData('nome', e.target.value)} className={inputCls} placeholder="Ex.: Diesel S10" />
            {errors.nome && <p className="text-red-600 text-xs mt-1">{errors.nome}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fator fóssil (kg CO₂/L)</label>
              <input type="number" step="0.0001" min="0" value={data.fator_fossil} onChange={(e) => setData('fator_fossil', e.target.value)} className={inputCls} />
              {errors.fator_fossil && <p className="text-red-600 text-xs mt-1">{errors.fator_fossil}</p>}
              <p className="text-[11px] text-gray-400 mt-0.5">do componente fóssil puro</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fator biogênico (kg CO₂/L)</label>
              <input type="number" step="0.0001" min="0" value={data.fator_biogenico} onChange={(e) => setData('fator_biogenico', e.target.value)} className={inputCls} />
              {errors.fator_biogenico && <p className="text-red-600 text-xs mt-1">{errors.fator_biogenico}</p>}
              <p className="text-[11px] text-gray-400 mt-0.5">do componente biogênico puro</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">% biogênico (mistura)</label>
              <div className="relative">
                <input type="number" step="1" min="0" max="100"
                  value={Math.round(percBio * 100)}
                  onChange={(e) => setData('perc_biogenico', (Number(e.target.value) || 0) / 100)}
                  className={inputCls + ' pr-8'} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
              {errors.perc_biogenico && <p className="text-red-600 text-xs mt-1">{errors.perc_biogenico}</p>}
              <p className="text-[11px] text-gray-400 mt-0.5">ex.: diesel B14 = 14%; etanol = 100%</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ordem</label>
              <input type="number" step="1" min="0" value={data.ordem} onChange={(e) => setData('ordem', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg px-4 py-3 flex items-center justify-around text-sm">
            <div className="text-center">
              <p className="text-[11px] uppercase text-gray-500">CO₂ fóssil/L</p>
              <p className="font-bold text-rise-700">{fmt(co2Fossil)} kg</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase text-gray-500">CO₂ biogênico/L</p>
              <p className="font-bold text-gray-600">{fmt(co2Bio)} kg</p>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.ativo} onChange={(e) => setData('ativo', e.target.checked)} />
            <span className="text-sm">Ativo (aparece na seleção de combustível)</span>
          </label>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={processing} className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
