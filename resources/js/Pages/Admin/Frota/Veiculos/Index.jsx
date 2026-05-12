import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Admin/Frota/Veiculos/Index
 * Lista de veiculos com filtro de busca e paginacao Laravel.
 *
 * Props esperadas (vindas do VeiculoController@index):
 *   veiculos: PaginatorJSON { data, links, current_page, last_page, ... }
 *   filtros:  { q: string }
 */
export default function VeiculosIndex({ veiculos, filtros }) {
  const { flash } = usePage().props;
  const [q, setQ] = useState(filtros?.q ?? '');

  const buscar = (e) => {
    e.preventDefault();
    router.get(route('admin.frota.veiculos.index'), { q }, {
      preserveState: true, preserveScroll: true,
    });
  };

  const excluir = (v) => {
    if (!confirm(`Remover o veiculo ${v.prefixo}?`)) return;
    router.delete(route('admin.frota.veiculos.destroy', v.id), {
      preserveScroll: true,
    });
  };

  return (
    <>
      <Head title="Veiculos" />
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Veiculos</h1>
          <Link
            href={route('admin.frota.veiculos.create')}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            + Novo veiculo
          </Link>
        </header>

        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">
            {flash.success}
          </div>
        )}

        <form onSubmit={buscar} className="mb-4 flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por prefixo, placa, modelo..."
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
          <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded">
            Buscar
          </button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Prefixo</th>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {veiculos.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-8">Nenhum veiculo encontrado.</td></tr>
              ) : veiculos.data.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.prefixo}</td>
                  <td className="px-4 py-3">{v.placa || '—'}</td>
                  <td className="px-4 py-3">{v.modelo || '—'}</td>
                  <td className="px-4 py-3">{v.obra?.nome_fantasia || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {v.tipo_hr && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded mr-1">Horimetro</span>}
                    {v.tipo_km && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Hodometro</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      href={route('admin.frota.veiculos.edit', v.id)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => excluir(v)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginacao Laravel */}
        {veiculos.links && veiculos.links.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {veiculos.links.map((link, i) => (
              <Link
                key={i}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 rounded text-sm ${
                  link.active
                    ? 'bg-emerald-600 text-white'
                    : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                }`}
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
