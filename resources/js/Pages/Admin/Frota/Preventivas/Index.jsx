import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';
import { safeLabel } from '@/utils/sanitize';

/**
 * Catálogo de planos de preventiva (padrão diário de bordo). Filtros via GET:
 * busca ao digitar + veículo (Select2). CRUD preservado.
 */
export default function PreventivasIndex({ preventivas, veiculos = [], filtros = {} }) {
  const { flash } = usePage().props;
  const [q, setQ] = useState(filtros?.q ?? '');
  const [veiculoId, setVeiculoId] = useState(filtros?.veiculo_id ? String(filtros.veiculo_id) : '');

  const aplicar = (extra = {}) => {
    router.get(route('admin.frota.preventivas.index'),
      { q: q || undefined, veiculo_id: veiculoId || undefined, ...extra },
      { preserveState: true, preserveScroll: true });
  };
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setQ(''); setVeiculoId(''); router.get(route('admin.frota.preventivas.index'), {}, { preserveScroll: true }); };

  const optVeiculos = useMemo(() => veiculos.map((v) => ({ value: v.id, label: `${v.prefixo}${v.placa ? ' (' + v.placa + ')' : ''}` })), [veiculos]);

  const excluir = (p) => {
    if (!confirm(`Remover "${p.nome_preventiva}"?`)) return;
    router.delete(route('admin.frota.preventivas.destroy', p.id), { preserveScroll: true });
  };

  const duplicar = (p) => {
    if (!confirm(`Duplicar "${p.nome_preventiva}"?`)) return;
    router.post(route('admin.frota.preventivas.duplicar', p.id), {}, { preserveScroll: true });
  };

  const agora = new Date().toLocaleString('pt-BR');

  return (
    <AuthenticatedLayout>
      <Head title="Preventivas" />
      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Preventivas</h1>
            <p className="text-sm text-gray-500">Planos de manutenção preventiva por veículo</p>
          </div>
          <Link href={route('admin.frota.preventivas.create')} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Nova preventiva</Link>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
        {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

        {/* Filtros (GET; busca ao digitar, veículo com pesquisa) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome do plano (busca ao digitar)"
            className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500"
          />
          <SearchableSelect value={veiculoId} onChange={(v) => { setVeiculoId(v); aplicar({ veiculo_id: v || undefined }); }} options={optVeiculos} placeholder="Todos os veículos" className="min-w-[220px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Veículo</th>
                <th className="px-3 py-2 text-right">Serviços</th>
                <th className="px-3 py-2 text-right">Histórico</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preventivas.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-8">Nenhuma preventiva cadastrada.</td></tr>
              ) : preventivas.data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{p.nome_preventiva}</td>
                  <td className="px-3 py-2 text-gray-600">{p.veiculo?.prefixo ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={route('admin.frota.preventivas.show', p.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition">{p.itens_count} serviços</Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={route('admin.frota.preventivas.show', p.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">{p.itens_realizados_count} execuções</Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.situacao === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{p.situacao ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                    <Link href={route('admin.frota.preventivas.edit', p.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</Link>
                    <button onClick={() => duplicar(p)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition">Duplicar</button>
                    <button onClick={() => excluir(p)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preventivas.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {preventivas.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                className={`px-3 py-1 rounded text-sm ${link.active ? 'bg-rise-600 text-white' : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'}`}
                dangerouslySetInnerHTML={safeLabel(link.label)} />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
