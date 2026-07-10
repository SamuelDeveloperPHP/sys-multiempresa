import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/SearchableSelect';
import { useMemo } from 'react';

const SITUACOES = [
  { value: '1', symbol: '⚫', label: 'Obrigatória' },
  { value: '2', symbol: '◉', label: 'Executar conforme condição' },
  { value: '3', symbol: '▲', label: 'Conferir / Verificar' },
];
const TIPOS = [
  { value: 'km', label: 'Quilômetros' },
  { value: 'hr', label: 'Horas' },
  { value: 'tmp', label: 'Meses' },
];

const linhaVazia = () => ({
  id: null, nome_servico: '', situacao: '1',
  periodo_maq_vei: '', alerta_venci: '', tipo_itens: 'km',
  periodo_mes: '', alert_venc_mes: '',
});

export default function PreventivaForm({ preventiva, veiculos }) {
  const editando = !!preventiva?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    id_veiculo: preventiva?.id_veiculo ?? '',
    nome_preventiva: preventiva?.nome_preventiva ?? '',
    situacao: preventiva?.situacao ?? 'Ativo',
    itens: preventiva?.itens?.length
      ? preventiva.itens.map((i) => ({
          id: i.id,
          nome_servico: i.nome_servico ?? '',
          situacao: String(i.situacao ?? '1'),
          periodo_maq_vei: i.periodo_maq_vei ?? '',
          alerta_venci: i.alerta_venci ?? '',
          tipo_itens: i.tipo_itens ?? 'km',
          periodo_mes: i.periodo_mes ?? '',
          alert_venc_mes: i.alert_venc_mes ?? '',
        }))
      : [linhaVazia()],
  });

  const optVeiculos = useMemo(
    () => veiculos.map((v) => ({ value: v.id, label: `${v.prefixo}${v.placa ? ' (' + v.placa + ')' : ''}` })),
    [veiculos]
  );

  const setItem = (idx, campo, valor) =>
    setData('itens', data.itens.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  const addLinha = () => setData('itens', [...data.itens, linhaVazia()]);
  const removeLinha = (idx) =>
    setData('itens', data.itens.length > 1 ? data.itens.filter((_, i) => i !== idx) : data.itens);

  const submit = (e) => {
    e.preventDefault();
    editando ? put(route('admin.frota.preventivas.update', preventiva.id))
             : post(route('admin.frota.preventivas.store'));
  };

  const erroItem = (idx, campo) => errors[`itens.${idx}.${campo}`];

  return (
    <AuthenticatedLayout>
      <Head title={editando ? 'Editar preventiva' : 'Nova preventiva'} />
      <div className="p-4 md:p-6 w-full">
        {/* Cabeçalho + legenda */}
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{editando ? 'Editar Manutenção Preventiva' : 'Cadastrar Manutenção Preventiva'}</h1>
            <Link href={route('admin.frota.preventivas.index')} className="text-sm text-gray-600 hover:underline">← voltar</Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">Legenda da situação</span>
            {SITUACOES.map((s) => (
              <span key={s.value} className="px-2 py-1 rounded border bg-white text-gray-700">
                <span className="mr-1">{s.symbol}</span>{s.label}
              </span>
            ))}
          </div>
        </header>

        <form onSubmit={submit} className="bg-white rounded-lg shadow border p-4 md:p-6">
          {/* Header: veículo + nome + situação */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold mb-1">Veículo</label>
              <SearchableSelect
                value={data.id_veiculo ? String(data.id_veiculo) : ''}
                onChange={(v) => setData('id_veiculo', v)}
                options={optVeiculos}
                placeholder="— catálogo genérico —"
                className="w-full"
              />
              {errors.id_veiculo && <p className="text-red-600 text-sm mt-1">{errors.id_veiculo}</p>}
            </div>
            <div className="md:col-span-7">
              <label className="block text-sm font-semibold mb-1">Nome da Preventiva *</label>
              <input value={data.nome_preventiva} onChange={(e) => setData('nome_preventiva', e.target.value)}
                     className="w-full border border-gray-300 rounded px-3 py-2" />
              {errors.nome_preventiva && <p className="text-red-600 text-sm mt-1">{errors.nome_preventiva}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Situação do plano</label>
              <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2">
                <option>Ativo</option><option>Inativo</option>
              </select>
            </div>
          </div>

          {/* Serviços */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">Serviços do plano</h2>
            <button type="button" onClick={addLinha}
                    className="px-3 py-1.5 bg-rise-600 text-white rounded text-sm font-medium hover:bg-rise-700">
              + Adicionar serviço
            </button>
          </div>
          {typeof errors.itens === 'string' && <p className="text-red-600 text-sm mb-2">{errors.itens}</p>}

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-2 py-2 min-w-[200px]">Nome do Serviço *</th>
                  <th className="px-2 py-2 min-w-[130px]">Situação *</th>
                  <th className="px-2 py-2">Período</th>
                  <th className="px-2 py-2">Alerta período</th>
                  <th className="px-2 py-2 min-w-[110px]">Tipo *</th>
                  <th className="px-2 py-2">Mêses</th>
                  <th className="px-2 py-2">Alerta mês</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.itens.map((it, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="px-2 py-2">
                      <input value={it.nome_servico} onChange={(e) => setItem(idx, 'nome_servico', e.target.value)}
                             className="w-full border border-gray-300 rounded px-2 py-1" />
                      {erroItem(idx, 'nome_servico') && <p className="text-red-600 text-xs mt-0.5">{erroItem(idx, 'nome_servico')}</p>}
                    </td>
                    <td className="px-2 py-2">
                      <select value={it.situacao} onChange={(e) => setItem(idx, 'situacao', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1">
                        {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.symbol} {s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" value={it.periodo_maq_vei} onChange={(e) => setItem(idx, 'periodo_maq_vei', e.target.value)}
                             className="w-20 border border-gray-300 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" value={it.alerta_venci} onChange={(e) => setItem(idx, 'alerta_venci', e.target.value)}
                             className="w-20 border border-gray-300 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">
                      <select value={it.tipo_itens} onChange={(e) => setItem(idx, 'tipo_itens', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1">
                        {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" value={it.periodo_mes} onChange={(e) => setItem(idx, 'periodo_mes', e.target.value)}
                             className="w-20 border border-gray-300 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" value={it.alert_venc_mes} onChange={(e) => setItem(idx, 'alert_venc_mes', e.target.value)}
                             className="w-20 border border-gray-300 rounded px-2 py-1" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeLinha(idx)} disabled={data.itens.length <= 1}
                              className="text-red-600 hover:text-red-800 disabled:opacity-30" title="Remover serviço">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <Link href={route('admin.frota.preventivas.index')} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</Link>
            <button type="submit" disabled={processing}
                    className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
