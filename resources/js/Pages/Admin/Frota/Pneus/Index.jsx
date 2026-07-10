import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { safeLabel } from '@/utils/sanitize';

const SIT = {
  estoque:    { label: 'Estoque',    cls: 'bg-blue-100 text-blue-700' },
  montado:    { label: 'Montado',    cls: 'bg-green-100 text-green-700' },
  recapadora: { label: 'Recapadora', cls: 'bg-amber-100 text-amber-700' },
  conserto:   { label: 'Conserto',   cls: 'bg-orange-100 text-orange-700' },
  sucata:     { label: 'Sucata',     cls: 'bg-gray-300 text-gray-700' },
};
const vidaLabel = (v) => (v > 0 ? `${v}ª vida` : 'Novo');
const fmtCpk = (v, label) => (v == null ? '—' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })} ${label}`);

export default function PneusIndex({ pneus, filtros = {}, resumo = {} }) {
  const { flash } = usePage().props;
  const [q, setQ] = useState(filtros?.q ?? '');
  const [situacao, setSituacao] = useState(filtros?.situacao ?? '');

  const aplicar = (extra = {}) => router.get(route('admin.frota.pneus.index'),
    { q: q || undefined, situacao: situacao || undefined, ...extra },
    { preserveState: true, preserveScroll: true });

  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(() => aplicar(), 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const excluir = (p) => {
    if (!confirm(`Remover o pneu ${p.numero_fogo}?`)) return;
    router.delete(route('admin.frota.pneus.destroy', p.id), { preserveScroll: true });
  };

  const Card = ({ label, value, cls }) => (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="text-xs uppercase opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value ?? 0}</p>
    </div>
  );

  return (
    <AuthenticatedLayout>
      <Head title="Pneus" />
      <div className="p-4 md:p-6 w-full">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Pneus</h1>
            <p className="text-sm text-gray-500">Carcaças, vidas, custo por km (CPK)</p>
          </div>
          <Link href={route('admin.frota.pneus.create')} className="bg-rise-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rise-700">+ Novo pneu</Link>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
        {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Card label="Total" value={resumo.total} cls="bg-white" />
          <Card label="Montados" value={resumo.montados} cls="bg-green-50 border-green-200" />
          <Card label="Em estoque" value={resumo.estoque} cls="bg-blue-50 border-blue-200" />
          <Card label="Sucateados" value={resumo.sucata} cls="bg-gray-50" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nº de fogo, marca ou medida"
            className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500" />
          <select value={situacao} onChange={(e) => { setSituacao(e.target.value); aplicar({ situacao: e.target.value || undefined }); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas as situações</option>
            {Object.entries(SIT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Nº de fogo</th>
                <th className="px-3 py-2">Marca / Medida</th>
                <th className="px-3 py-2">Vida</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Veículo / Posição</th>
                <th className="px-3 py-2 text-right">Rodado</th>
                <th className="px-3 py-2 text-right">CPK</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pneus.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-8">Nenhum pneu cadastrado.</td></tr>
              ) : pneus.data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{p.numero_fogo}</td>
                  <td className="px-3 py-2 text-gray-600">{[p.marca, p.medida].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-3 py-2">{vidaLabel(p.vida_atual)}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${SIT[p.situacao]?.cls ?? 'bg-gray-100'}`}>{SIT[p.situacao]?.label ?? p.situacao}</span></td>
                  <td className="px-3 py-2 text-gray-600">{p.veiculo ? `${p.veiculo} (${p.posicao})` : '—'}</td>
                  <td className="px-3 py-2 text-right">{p.rodado ? `${Number(p.rodado).toLocaleString('pt-BR')} ${p.unidade}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmtCpk(p.cpk, p.cpk_label)}</td>
                  <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                    <Link href={route('admin.frota.pneus.show', p.id)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100">Ficha</Link>
                    <Link href={route('admin.frota.pneus.edit', p.id)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">Editar</Link>
                    <button onClick={() => excluir(p)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pneus.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {pneus.links.map((link, i) => (
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
