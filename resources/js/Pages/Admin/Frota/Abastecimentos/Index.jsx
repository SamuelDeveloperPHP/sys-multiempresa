import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const fmtMoney = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum   = (v) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fmtData  = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

export default function AbastecimentosIndex({ abastecimentos, veiculos, obras, totais, filtros }) {
  const { flash } = usePage().props;
  const [f, setF] = useState({
    veiculo_id: filtros?.veiculo_id ?? '',
    id_obra:    filtros?.id_obra ?? '',
    data_ini:   filtros?.data_ini ?? '',
    data_fim:   filtros?.data_fim ?? '',
  });

  const aplicar = (e) => {
    e?.preventDefault?.();
    router.get(route('admin.frota.abastecimentos.index'), f, { preserveState: true, preserveScroll: true });
  };
  const excluir = (a) => {
    if (!confirm('Remover este abastecimento?')) return;
    router.delete(route('admin.frota.abastecimentos.destroy', a.id), { preserveScroll: true });
  };

  return (
    <>
      <Head title="Abastecimentos" />
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Abastecimentos</h1>
          <Link href={route('admin.frota.abastecimentos.create')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">+ Novo abastecimento</Link>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card label="Total de litros" value={fmtNum(totais.quantidade)} />
          <Card label="Total gasto" value={fmtMoney(totais.valor_total)} />
          <Card label="# Abastecimentos" value={totais.registros} />
        </div>

        <form onSubmit={aplicar} className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <select value={f.veiculo_id} onChange={(e) => setF({ ...f, veiculo_id: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.prefixo} {v.placa ? `(${v.placa})` : ''}</option>)}
          </select>
          <select value={f.id_obra} onChange={(e) => setF({ ...f, id_obra: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2">
            <option value="">Todas as obras</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia}</option>)}
          </select>
          <input type="date" value={f.data_ini} onChange={(e) => setF({ ...f, data_ini: e.target.value })}
                 className="border border-gray-300 rounded px-3 py-2" />
          <input type="date" value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })}
                 className="border border-gray-300 rounded px-3 py-2" />
          <button className="px-4 py-2 bg-gray-800 text-white rounded">Filtrar</button>
        </form>

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Combustível</th>
                <th className="px-4 py-3 text-right">Quantidade (L)</th>
                <th className="px-4 py-3 text-right">R$/litro</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {abastecimentos.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-8">Nenhum abastecimento encontrado.</td></tr>
              ) : abastecimentos.data.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{fmtData(a.data_abastecimento)}</td>
                  <td className="px-4 py-3 font-medium">{a.veiculo?.prefixo} {a.veiculo?.placa && <span className="text-gray-400">({a.veiculo.placa})</span>}</td>
                  <td className="px-4 py-3">{a.obra?.nome_fantasia ?? '—'}</td>
                  <td className="px-4 py-3">{a.combustivel ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(a.quantidade)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(a.valor_do_litro)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtMoney(a.valor_total)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link href={route('admin.frota.abastecimentos.edit', a.id)} className="text-blue-600 hover:underline">Editar</Link>
                    <button onClick={() => excluir(a)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {abastecimentos.links?.length > 3 && (
          <nav className="flex justify-center gap-1 mt-4">
            {abastecimentos.links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'} preserveScroll
                    className={`px-3 py-1 rounded text-sm ${
                      link.active ? 'bg-emerald-600 text-white'
                                  : link.url ? 'bg-white border hover:bg-gray-50' : 'opacity-30 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
