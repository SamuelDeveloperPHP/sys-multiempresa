import { Head, Link, router, usePage } from '@inertiajs/react';
import { safeLabel } from '@/utils/sanitize';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const situacaoCor = {
  'Ativo':       'bg-green-100 text-green-700',
  'Inativo':     'bg-gray-200 text-gray-700',
  'Manutenção':  'bg-amber-100 text-amber-800',
  'Vendido':     'bg-blue-100 text-blue-700',
  'Baixado':     'bg-red-100 text-red-700',
};

export default function VeiculosIndex({ veiculos, obras, categorias, filtros }) {
  const { flash } = usePage().props;
  const [f, setF] = useState({
    q:            filtros?.q ?? '',
    situacao:     filtros?.situacao ?? '',
    obra_id:      filtros?.obra_id ?? '',
    id_categoria: filtros?.id_categoria ?? '',
  });

  const buscar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.veiculos.index'), f, {
      preserveState: true, preserveScroll: true,
    });
  };

  const limpar = () => {
    const reset = { q: '', situacao: '', obra_id: '', id_categoria: '' };
    setF(reset);
    router.get(route('admin.frota.veiculos.index'), reset, {
      preserveState: true, preserveScroll: true,
    });
  };

  const excluir = (v) => {
    if (!confirm(`Remover o veículo ${v.prefixo}?`)) return;
    router.delete(route('admin.frota.veiculos.destroy', v.id), { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Veículos" />
      <div className="p-6 w-full">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Veículos</h1>
            <p className="text-sm text-gray-500">Cadastro completo da frota (veículos, máquinas e equipamentos)</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={route('admin.frota.combustiveis.index')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Combustíveis / CO₂
            </Link>
            <Link
              href={route('admin.frota.veiculos.create')}
              className="bg-rise-600 text-white px-4 py-2 rounded-lg hover:bg-rise-700"
            >
              + Novo veículo
            </Link>
          </div>
        </header>

        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">
            {flash.success}
          </div>
        )}

        <form onSubmit={buscar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="Buscar por prefixo, placa, marca, modelo..."
            className="md:col-span-2 border border-gray-300 rounded px-3 py-2"
          />
          <select value={f.situacao} onChange={(e) => setF({ ...f, situacao: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as situações</option>
            <option>Ativo</option>
            <option>Inativo</option>
            <option>Manutenção</option>
            <option>Vendido</option>
            <option>Baixado</option>
          </select>
          <select value={f.id_categoria} onChange={(e) => setF({ ...f, id_categoria: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
          </select>
          <select value={f.obra_id} onChange={(e) => setF({ ...f, obra_id: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as obras</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
          </select>
          <div className="md:col-span-5 flex gap-2 justify-end">
            <button type="button" onClick={limpar} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Limpar</button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
          </div>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-1"></th>
                <th className="px-4 py-1">Prefixo</th>
                <th className="px-4 py-1">Veículo</th>
                <th className="px-4 py-1">Placa</th>
                <th className="px-4 py-1">Categoria</th>
                <th className="px-4 py-1">Obra</th>
                <th className="px-4 py-1">Tipo</th>
                <th className="px-4 py-1">Situação</th>
                <th className="px-4 py-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {veiculos.data.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-8">Nenhum veículo encontrado.</td></tr>
              ) : veiculos.data.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-1">
                    {v.imagem ? (
                      <img src={route('admin.frota.veiculos.imagem-principal', v.id)} alt="" className="w-12 h-12 object-cover rounded border" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">sem foto</div>
                    )}
                  </td>
                  <td className="px-4 py-1 font-semibold">{v.prefixo}</td>
                  <td className="px-4 py-1">
                    <div>{v.marca} {v.modelo}</div>
                    {v.ano && <div className="text-xs text-gray-500">Ano: {v.ano}</div>}
                  </td>
                  <td className="px-4 py-1 font-mono">{v.placa || '—'}</td>
                  <td className="px-4 py-1">{v.categoria?.nome_categoria ?? '—'}</td>
                  <td className="px-4 py-1">{v.obra?.nome_fantasia ?? '—'}</td>
                  <td className="px-4 py-1' text-xs">
                    {v.tipo_hr && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded mr-1">Hr</span>}
                    {v.tipo_km && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-1">Km</span>}
                    {v.tipo_tempo && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Tempo</span>}
                  </td>
                  <td className="px-4 py-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${situacaoCor[v.situacao] ?? 'bg-gray-100 text-gray-700'}`}>
                      {v.situacao ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-1 text-right space-x-2 whitespace-nowrap">
                    <Link href={route('admin.frota.veiculos.show', v.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Ver</Link>
                    <Link href={route('admin.frota.veiculos.edit', v.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</Link>
                    <button onClick={() => excluir(v)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {veiculos.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {veiculos.links.map((link, i) => (
              <Link
                key={i}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 rounded text-sm ${
                  link.active
                    ? 'bg-rise-600 text-white'
                    : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                }`}
                dangerouslySetInnerHTML={safeLabel(link.label)}
              />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
