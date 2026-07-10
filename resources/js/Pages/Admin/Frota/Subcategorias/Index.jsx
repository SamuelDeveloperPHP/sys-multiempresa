import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';
import { safeLabel } from '@/utils/sanitize';

export default function SubcategoriasIndex({ subcategorias, categorias = [], filtros = {} }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState(filtros?.q ?? '');
  const [categoriaId, setCategoriaId] = useState(filtros?.id_categoria ? String(filtros.id_categoria) : '');
  const novo = useForm({ id_categoria: '', nome_subcategoria: '', status_subcategoria: 'Ativo' });

  const aplicar = (extra = {}) => {
    router.get(route('admin.frota.subcategorias.index'),
      { q: q || undefined, id_categoria: categoriaId || undefined, ...extra },
      { preserveState: true, preserveScroll: true });
  };
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setQ(''); setCategoriaId(''); router.get(route('admin.frota.subcategorias.index'), {}, { preserveScroll: true }); };

  const optCategorias = useMemo(() => categorias.map((c) => ({ value: c.id, label: c.nome_categoria })), [categorias]);

  const salvarNovo = (e) => { e.preventDefault(); novo.post(route('admin.frota.subcategorias.store'), { preserveScroll: true, onSuccess: () => novo.reset() }); };
  const excluir = (s) => { if (!confirm(`Remover a subcategoria "${s.nome_subcategoria}"?`)) return; router.delete(route('admin.frota.subcategorias.destroy', s.id), { preserveScroll: true }); };

  const agora = new Date().toLocaleString('pt-BR');

  return (
    <AuthenticatedLayout>
      <Head title="Subcategorias de Veículo" />
      <div className="p-4 md:p-6 w-full max-w-5xl">
        <header className="mb-1">
          <h1 className="text-2xl font-bold">Subcategorias de Veículo</h1>
          <p className="text-sm text-gray-500">Detalhamento por categoria (ex.: Carro/Sedã, Caminhão/3 eixos)</p>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={salvarNovo} className="bg-white rounded-lg border p-4 mb-4">
          <h2 className="font-semibold mb-2 text-sm text-gray-700">Adicionar subcategoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <select value={novo.data.id_categoria} onChange={(e) => novo.setData('id_categoria', e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">— categoria —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
            </select>
            <input value={novo.data.nome_subcategoria} onChange={(e) => novo.setData('nome_subcategoria', e.target.value)} placeholder="Nome *" className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm" />
            <select value={novo.data.status_subcategoria} onChange={(e) => novo.setData('status_subcategoria', e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm"><option>Ativo</option><option>Inativo</option></select>
            <button type="submit" disabled={novo.processing} className="bg-rise-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-rise-700 disabled:opacity-50">{novo.processing ? '...' : 'Adicionar'}</button>
          </div>
          {(novo.errors.id_categoria || novo.errors.nome_subcategoria) && (
            <p className="text-red-600 text-sm mt-1">{novo.errors.id_categoria || novo.errors.nome_subcategoria}</p>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (ao digitar)" className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500" />
          <SearchableSelect value={categoriaId} onChange={(v) => { setCategoriaId(v); aplicar({ id_categoria: v || undefined }); }} options={optCategorias} placeholder="Todas as categorias" className="min-w-[220px]" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr>
              <th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Subcategoria</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Ações</th>
            </tr></thead>
            <tbody className="divide-y">
              {subcategorias.data.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-gray-500 py-8">Nenhuma subcategoria cadastrada.</td></tr>
              ) : subcategorias.data.map((s) => (
                <Row key={s.id} sub={s} categorias={categorias} editing={editingId === s.id} onEdit={() => setEditingId(s.id)} onCancel={() => setEditingId(null)} onDelete={() => excluir(s)} />
              ))}
            </tbody>
          </table>
        </div>

        {subcategorias.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {subcategorias.links.map((link, i) => (
              <a key={i} href={link.url ?? '#'} className={`px-3 py-1 rounded text-sm ${link.active ? 'bg-rise-600 text-white' : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'}`} dangerouslySetInnerHTML={safeLabel(link.label)} />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function Row({ sub, categorias, editing, onEdit, onCancel, onDelete }) {
  const edit = useForm({ id_categoria: sub.id_categoria, nome_subcategoria: sub.nome_subcategoria, status_subcategoria: sub.status_subcategoria ?? 'Ativo' });
  const salvar = (e) => { e.preventDefault(); edit.put(route('admin.frota.subcategorias.update', sub.id), { preserveScroll: true, onSuccess: onCancel }); };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-3 py-2 text-gray-600">{sub.categoria?.nome_categoria ?? '—'}</td>
        <td className="px-3 py-2 font-medium text-gray-800">{sub.nome_subcategoria}</td>
        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${sub.status_subcategoria === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{sub.status_subcategoria}</span></td>
        <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
          <button onClick={onEdit} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
        </td>
      </tr>
    );
  }
  return (
    <tr className="bg-amber-50">
      <td className="px-3 py-2">
        <select value={edit.data.id_categoria} onChange={(e) => edit.setData('id_categoria', e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input value={edit.data.nome_subcategoria} onChange={(e) => edit.setData('nome_subcategoria', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2"><select value={edit.data.status_subcategoria} onChange={(e) => edit.setData('status_subcategoria', e.target.value)} className="w-full border rounded px-2 py-1 text-sm"><option>Ativo</option><option>Inativo</option></select></td>
      <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
        <button onClick={salvar} disabled={edit.processing} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rise-700 bg-rise-50 border border-rise-200 rounded-md hover:bg-rise-100 transition">Salvar</button>
        <button onClick={onCancel} className="text-gray-600 hover:underline text-xs">Cancelar</button>
      </td>
    </tr>
  );
}
