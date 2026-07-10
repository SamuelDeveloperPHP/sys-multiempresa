import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { safeLabel } from '@/utils/sanitize';

/**
 * Catálogo de modelos de checklist (os itens que o app baixa). Padrão diário de
 * bordo: header + Data atual + busca AO DIGITAR (GET). CRUD preservado.
 */
export default function ChecklistsIndex({ checklists, filtros = {} }) {
  const { flash } = usePage().props;
  const [q, setQ] = useState(filtros?.q ?? '');

  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => {
      router.get(route('admin.frota.checklists.index'), { q: q || undefined }, { preserveState: true, preserveScroll: true });
    }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setQ(''); router.get(route('admin.frota.checklists.index'), {}, { preserveScroll: true }); };

  const excluir = (c) => {
    if (!confirm(`Remover o checklist "${c.nome_checklist}"?`)) return;
    router.delete(route('admin.frota.checklists.destroy', c.id), { preserveScroll: true });
  };

  const duplicar = (c) => {
    if (!confirm(`Duplicar o checklist "${c.nome_checklist}"?`)) return;
    router.post(route('admin.frota.checklists.duplicar', c.id), {}, { preserveScroll: true });
  };

  const agora = new Date().toLocaleString('pt-BR');

  return (
    <AuthenticatedLayout>
      <Head title="Modelos de checklist" />
      <div className="p-4 md:p-6 w-full">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Modelos de checklist</h1>
            <p className="text-sm text-gray-500">Itens que o app baixa para o preenchimento em campo</p>
          </div>
          <Link href={route('admin.frota.checklists.create')} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo modelo</Link>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
        {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

        {/* Filtro (GET; busca ao digitar) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome do checklist (busca ao digitar)"
            className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500"
          />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Veículo</th>
                <th className="px-3 py-2 text-right"># Itens</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checklists.data.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-500 py-8">Nenhum modelo cadastrado.</td></tr>
              ) : checklists.data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{c.nome_checklist}</td>
                  <td className="px-3 py-2 text-gray-600">{c.veiculo ? `${c.veiculo.prefixo}${c.veiculo.placa ? ' (' + c.veiculo.placa + ')' : ''}` : '—'}</td>
                  <td className="px-3 py-2 text-right">{c.itens_count}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.situacao === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{c.situacao || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                    <Link href={route('admin.frota.checklists.itens.index', c.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Itens ({c.itens_count})</Link>
                    <Link href={route('admin.frota.checklists.edit', c.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</Link>
                    <button onClick={() => duplicar(c)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition">Duplicar</button>
                    <button onClick={() => excluir(c)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {checklists.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {checklists.links.map((link, i) => (
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
