import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const hoje = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const fmtData = (d) => { if (!d) return '—'; const s = String(d); const dt = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s); return dt.toLocaleDateString('pt-BR'); };
const fmtMoney = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const vidaLabel = (v) => (v > 0 ? `${v}ª vida` : 'Novo');
const TIPO_MOV = { compra: 'Compra', montagem: 'Montagem', desmontagem: 'Desmontagem', rodizio: 'Rodízio', recapagem: 'Recapagem', conserto: 'Conserto', sucateamento: 'Sucateamento' };
const SIT = { estoque: 'Estoque', montado: 'Montado', recapadora: 'Recapadora', conserto: 'Conserto', sucata: 'Sucata' };

export default function PneuShow({ pneu, cpk, movimentacoes, inspecoes }) {
  const { flash } = usePage().props;
  const [modal, setModal] = useState(null); // 'recapar' | 'consertar' | 'sucatear' | 'inspecionar'
  const sucata = pneu.situacao === 'sucata';
  const montado = pneu.situacao === 'montado';

  return (
    <AuthenticatedLayout>
      <Head title={`Pneu ${pneu.numero_fogo}`} />
      <div className="p-4 md:p-6 w-full">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Pneu {pneu.numero_fogo}
              <span className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-700">{SIT[pneu.situacao] ?? pneu.situacao}</span>
              <span className="px-2 py-0.5 rounded text-sm bg-indigo-50 text-indigo-700">{vidaLabel(pneu.vida_atual)}</span>
            </h1>
            <p className="text-gray-600">{[pneu.marca, pneu.modelo, pneu.medida, pneu.desenho].filter(Boolean).join(' · ') || '—'}</p>
            <Link href={route('admin.frota.pneus.index')} className="text-sm text-gray-600 hover:underline">← voltar ao catálogo</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModal('inspecionar')} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">Inspecionar</button>
            <button onClick={() => setModal('recapar')} disabled={sucata || montado} title={montado ? 'Desmonte o pneu do veículo antes de recapar' : undefined} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-40">Recapar</button>
            <button onClick={() => setModal('consertar')} disabled={sucata} className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-40">Consertar</button>
            <button onClick={() => setModal('sucatear')} disabled={sucata || montado} title={montado ? 'Desmonte o pneu do veículo antes de sucatear' : undefined} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-40">Sucatear</button>
          </div>
        </header>

        {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
        {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

        {/* CPK */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs uppercase text-gray-500">CPK</p>
            <p className="text-2xl font-bold mt-1">{cpk.cpk == null ? '—' : `R$ ${Number(cpk.cpk).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })}`}</p>
            <p className="text-xs text-gray-500">{cpk.cpk_label}</p>
          </div>
          <Info label="Rodado" value={cpk.rodado ? `${Number(cpk.rodado).toLocaleString('pt-BR')} ${cpk.unidade}` : '—'} />
          <Info label="Custo total" value={fmtMoney(cpk.custo_total)} />
          <Info label="Compra / Recap / Conserto" value={`${fmtMoney(cpk.custo_compra)} · ${fmtMoney(cpk.custo_recapagens)} · ${fmtMoney(cpk.custo_consertos)}`} small />
        </div>

        {/* Ledger */}
        <h2 className="text-lg font-bold mb-2">Histórico (ledger)</h2>
        <div className="bg-white rounded-lg border overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Data</th><th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Veículo</th><th className="px-3 py-2">Posição</th>
                <th className="px-3 py-2 text-right">Medição</th><th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movimentacoes.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-6">Sem movimentações.</td></tr>
              ) : movimentacoes.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{fmtData(m.data)}</td>
                  <td className="px-3 py-2 font-medium">{TIPO_MOV[m.tipo] ?? m.tipo}{m.tipo === 'recapagem' && m.vida_resultante ? ` (${m.vida_resultante}ª vida)` : ''}</td>
                  <td className="px-3 py-2 text-gray-600">{m.veiculo?.prefixo ?? '—'}</td>
                  <td className="px-3 py-2">{m.posicao_anterior ? `${m.posicao_anterior} → ${m.posicao}` : (m.posicao ?? '—')}</td>
                  <td className="px-3 py-2 text-right">{m.medicao != null ? `${Number(m.medicao).toLocaleString('pt-BR')} ${m.medicao_tipo ?? ''}` : '—'}</td>
                  <td className="px-3 py-2 text-right">{m.valor != null ? fmtMoney(m.valor) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inspeções */}
        <h2 className="text-lg font-bold mb-2">Inspeções</h2>
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Data</th><th className="px-3 py-2 text-right">Sulco (mm)</th>
                <th className="px-3 py-2 text-right">Pressão (psi)</th><th className="px-3 py-2">Veículo</th>
                <th className="px-3 py-2">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inspecoes.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-500 py-6">Sem inspeções.</td></tr>
              ) : inspecoes.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{fmtData(i.data)}</td>
                  <td className="px-3 py-2 text-right font-medium">{i.sulco_mm ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{i.pressao_psi ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{i.veiculo?.prefixo ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{i.observacao ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modal && <ModalAcao pneu={pneu} tipo={modal} onClose={() => setModal(null)} />}
      </div>
    </AuthenticatedLayout>
  );
}

function Info({ label, value, small }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`font-semibold mt-1 ${small ? 'text-xs' : ''}`}>{value}</p>
    </div>
  );
}

const TITULO = { recapar: 'Registrar recapagem', consertar: 'Registrar conserto', sucatear: 'Sucatear pneu', inspecionar: 'Nova inspeção' };

// Campo em escopo de módulo (evita remontar o input a cada tecla / perda de foco).
function CampoModal({ label, name, type = 'text', step, data, setData, errors }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      <input type={type} step={step} value={data[name]} onChange={(e) => setData(name, e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
      {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );
}

function ModalAcao({ pneu, tipo, onClose }) {
  const { data, setData, post, processing, errors } = useForm({
    data: hoje(), valor: '', observacao: '', sulco_mm: '', pressao_psi: '', medicao: '',
  });
  const submit = (e) => {
    e.preventDefault();
    post(route(`admin.frota.pneus.${tipo}`, pneu.id), { preserveScroll: true, onSuccess: onClose });
  };
  const p = { data, setData, errors };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{TITULO[tipo]}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <CampoModal label="Data *" name="data" type="date" {...p} />
          {(tipo === 'recapar' || tipo === 'consertar') && <CampoModal label="Valor (R$)" name="valor" type="number" step="0.01" {...p} />}
          {tipo === 'inspecionar' && <>
            <CampoModal label="Sulco (mm)" name="sulco_mm" type="number" step="0.1" {...p} />
            <CampoModal label="Pressão (psi)" name="pressao_psi" type="number" step="1" {...p} />
            <CampoModal label="Medição (km/hr)" name="medicao" type="number" {...p} />
          </>}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Observação</label>
            <textarea value={data.observacao} onChange={(e) => setData('observacao', e.target.value)} rows={2} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={processing} className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">{processing ? 'Salvando...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
