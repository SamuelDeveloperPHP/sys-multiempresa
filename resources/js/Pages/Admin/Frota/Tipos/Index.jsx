import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { safeLabel } from '@/utils/sanitize';

export default function TiposIndex({ tipos, filtros = {} }) {
  const { flash } = usePage().props;
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState(filtros?.q ?? '');
  const novo = useForm({ nome: '', codigo: '' });

  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => router.get(route('admin.frota.tipos.index'), { q: q || undefined }, { preserveState: true, preserveScroll: true }), 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const limpar = () => { setQ(''); router.get(route('admin.frota.tipos.index'), {}, { preserveScroll: true }); };

  const salvarNovo = (e) => { e.preventDefault(); novo.post(route('admin.frota.tipos.store'), { preserveScroll: true, onSuccess: () => novo.reset() }); };
  const excluir = (t) => { if (!confirm(`Remover o tipo "${t.nome}"?`)) return; router.delete(route('admin.frota.tipos.destroy', t.id), { preserveScroll: true }); };

  const agora = new Date().toLocaleString('pt-BR');

  return (
    <AuthenticatedLayout>
      <Head title="Tipos de Veículo" />
      <div className="p-4 md:p-6 w-full max-w-5xl">
        <header className="mb-1">
          <h1 className="text-2xl font-bold">Tipos de Veículo</h1>
          <p className="text-sm text-gray-500">Catálogo de tipos (carro/moto/caminhão/máquina)</p>
        </header>
        <p className="text-sm text-gray-500 mb-4"><strong>Data atual:</strong> {agora}</p>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        <form onSubmit={salvarNovo} className="bg-white rounded-lg border p-4 mb-4">
          <h2 className="font-semibold mb-2 text-sm text-gray-700">Adicionar tipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={novo.data.nome} onChange={(e) => novo.setData('nome', e.target.value)} placeholder="Nome *" className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm" />
            <input value={novo.data.codigo} onChange={(e) => novo.setData('codigo', e.target.value)} placeholder="Código (opcional)" className="border border-gray-300 rounded px-3 py-2 text-sm" />
            <button type="submit" disabled={novo.processing} className="bg-rise-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-rise-700 disabled:opacity-50">{novo.processing ? '...' : 'Adicionar'}</button>
          </div>
          {novo.errors.nome && <p className="text-red-600 text-sm mt-1">{novo.errors.nome}</p>}
        </form>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (ao digitar)" className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500" />
          <button type="button" onClick={limpar} className="px-5 py-2 bg-rise-600 text-white rounded-lg text-sm font-medium hover:bg-rise-700">Limpar</button>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr>
              <th className="px-3 py-2">Nome</th><th className="px-3 py-2">Código</th><th className="px-3 py-2 text-right">Ações</th>
            </tr></thead>
            <tbody className="divide-y">
              {tipos.data.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-gray-500 py-8">Nenhum tipo cadastrado.</td></tr>
              ) : tipos.data.map((t) => (
                <Row key={t.id} tipo={t} editing={editingId === t.id} onEdit={() => setEditingId(t.id)} onCancel={() => setEditingId(null)} onDelete={() => excluir(t)} />
              ))}
            </tbody>
          </table>
        </div>

        {tipos.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {tipos.links.map((link, i) => (
              <a key={i} href={link.url ?? '#'} className={`px-3 py-1 rounded text-sm ${link.active ? 'bg-rise-600 text-white' : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'}`} dangerouslySetInnerHTML={safeLabel(link.label)} />
            ))}
          </nav>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function Row({ tipo, editing, onEdit, onCancel, onDelete }) {
  const edit = useForm({ nome: tipo.nome, codigo: tipo.codigo ?? '' });
  const salvar = (e) => { e.preventDefault(); edit.put(route('admin.frota.tipos.update', tipo.id), { preserveScroll: true, onSuccess: onCancel }); };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-3 py-2 font-medium text-gray-800">{tipo.nome}</td>
        <td className="px-3 py-2 font-mono text-gray-500">{tipo.codigo || '—'}</td>
        <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
          <button onClick={onEdit} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
        </td>
      </tr>
    );
  }
  return (
    <tr className="bg-amber-50">
      <td className="px-3 py-2"><input value={edit.data.nome} onChange={(e) => edit.setData('nome', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2"><input value={edit.data.codigo} onChange={(e) => edit.setData('codigo', e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
        <button onClick={salvar} disabled={edit.processing} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rise-700 bg-rise-50 border border-rise-200 rounded-md hover:bg-rise-100 transition">Salvar</button>
        <button onClick={onCancel} className="text-gray-600 hover:underline text-xs">Cancelar</button>
      </td>
    </tr>
  );
}
