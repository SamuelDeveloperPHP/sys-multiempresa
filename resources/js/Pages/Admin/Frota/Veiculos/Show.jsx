import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/* ============ helpers de formatação ============ */
const fmtMoney = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtNum   = (v, dec = 0) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
const fmtData  = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const situacaoCorretiva = {
  1: { label: 'Pendente',     cor: 'bg-amber-100 text-amber-800' },
  2: { label: 'Em Execução',  cor: 'bg-blue-100 text-blue-700' },
  3: { label: 'Concluído',    cor: 'bg-green-100 text-green-700' },
  4: { label: 'Cancelado',    cor: 'bg-red-100 text-red-700' },
};

const corValidade = (dias) => {
  if (dias === null || dias === undefined) return { label: 'Não possui', cor: 'bg-gray-200 text-gray-700' };
  if (dias < 0)   return { label: `Vencido há ${Math.abs(dias)}d`, cor: 'bg-gray-900 text-white' };
  if (dias === 0) return { label: 'Vence hoje', cor: 'bg-red-600 text-white' };
  if (dias < 15)  return { label: `${dias}d`, cor: 'bg-red-100 text-red-700' };
  if (dias < 40)  return { label: `${dias}d`, cor: 'bg-amber-100 text-amber-800' };
  return { label: `${dias}d`, cor: 'bg-green-100 text-green-700' };
};

const TABS = [
  { id: 'detalhes',       label: 'Detalhes' },
  { id: 'galeria',        label: 'Biblioteca' },
  { id: 'docs_tecnicos',  label: "Doc's Técnicos" },
  { id: 'docs_legais',    label: "Doc's Legais" },
  { id: 'corretivas',     label: 'Corretivas' },
  { id: 'preventivas',    label: 'Preventivas' },
  { id: 'seguros',        label: 'Seguros' },
  { id: 'ipvas',          label: "IPVA's" },
  { id: 'abastecimentos', label: 'Abastecimentos' },
  { id: 'medicoes',       label: 'Hodômetro/Horímetro' },
];

export default function VeiculoShow({
  veiculo,
  manutencoes = [],
  seguros = [],
  ipvas = [],
  docs_legais: docsLegais = [],
  docs_tecnicos: docsTecnicos = [],
  abastecimentos = [],
  medicoes = [],
  preventivas = [],
  dashboard_ciclos: dashboardCiclos = null,
  servicos_preventiva: servicosPreventiva = [],
  fornecedores = [],
}) {
  const { flash } = usePage().props;
  const [tab, setTab] = useState('detalhes');

  return (
    <AuthenticatedLayout>
      <Head title={`Veículo ${veiculo.prefixo}`} />

      <div className="p-6 w-full">
        {/* Header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={route('admin.frota.veiculos.index')}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            ← Voltar para a lista
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-3">
            <span>{veiculo.prefixo}</span>
            <span className={`px-3 py-1 rounded-full text-sm ${veiculo.situacao === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
              {veiculo.situacao || '—'}
            </span>
          </h1>
          <div className="flex gap-2">
            <a
              href={route('admin.frota.veiculos.zip-docs', veiculo.id)}
              target="_blank" rel="noreferrer"
              className="px-3 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 text-sm"
            >
              ☁ Baixar ZIP docs
            </a>
            <Link
              href={route('admin.frota.veiculos.historico-mnt', veiculo.id)}
              className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            >
              📜 Caderno Histórico
            </Link>
            <Link
              href={route('admin.frota.veiculos.edit', veiculo.id)}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Editar dados
            </Link>
          </div>
        </div>

        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>
        )}

        {/* Tabs nav */}
        <div className="bg-white border rounded-t-lg overflow-x-auto">
          <nav className="flex border-b min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? 'border-rise-600 text-rise-700 bg-rise-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tabs content */}
        <div className="bg-white border border-t-0 rounded-b-lg p-6">
          {tab === 'detalhes'       && <TabDetalhes veiculo={veiculo} />}
          {tab === 'galeria'        && <TabGaleria veiculo={veiculo} />}
          {tab === 'docs_tecnicos'  && <TabDocs tipo="técnicos" registros={docsTecnicos} veiculo={veiculo} />}
          {tab === 'docs_legais'    && <TabDocs tipo="legais" registros={docsLegais} veiculo={veiculo} />}
          {tab === 'corretivas'     && <TabCorretivas veiculo={veiculo} registros={manutencoes} fornecedores={fornecedores} />}
          {tab === 'preventivas'    && <TabPreventivas registros={preventivas} dashboard={dashboardCiclos} historico={servicosPreventiva} veiculo={veiculo} fornecedores={fornecedores} />}
          {tab === 'seguros'        && <TabSeguros registros={seguros} veiculo={veiculo} />}
          {tab === 'ipvas'          && <TabIpvas registros={ipvas} veiculo={veiculo} />}
          {tab === 'abastecimentos' && <TabAbastecimentos veiculo={veiculo} registros={abastecimentos} />}
          {tab === 'medicoes'       && <TabMedicoes veiculo={veiculo} registros={medicoes} />}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* ============ TAB: Detalhes ============ */
function TabDetalhes({ veiculo }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        {veiculo.imagem ? (
          <img src={route('admin.frota.veiculos.imagem-principal', veiculo.id)} alt="" className="w-full h-64 object-cover rounded border" />
        ) : (
          <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-400 rounded border">
            Sem imagem principal
          </div>
        )}
      </div>

      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Info label="Categoria" value={veiculo.categoria?.nome_categoria} />
        <Info label="Subcategoria" value={veiculo.subcategoria?.nome_subcategoria} />
        <Info label="Tipo" value={veiculo.tipo} />
        <Info label="Marca" value={veiculo.marca} />
        <Info label="Modelo" value={veiculo.modelo} />
        <Info label="Ano" value={veiculo.ano} />
        <Info label="Placa" value={veiculo.placa} mono />
        <Info label="Renavam" value={veiculo.renavam} mono />
        <Info label="Nº Série / Chassi" value={veiculo.nun_serie_chassi} mono />
        <Info label="Obra" value={veiculo.obra?.nome_fantasia} />
        <Info label="Plano preventiva" value={veiculo.preventiva?.nome_preventiva} />
        <Info label="Descrição livre" value={veiculo.veiculo} className="col-span-2 md:col-span-3" />
      </div>

      <Card title="Valor / FIPE" className="lg:col-span-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Info label="Valor FIPE"      value={fmtMoney(veiculo.valor_fipe)} />
          <Info label="Valor Aquisição" value={fmtMoney(veiculo.valor_aquisicao)} />
          <Info label="Valor Mercado"   value={fmtMoney(veiculo.valor_mercado)} />
          <Info label="Código FIPE"     value={veiculo.codigo_fipe} />
          <Info label="Mês ref. FIPE"   value={veiculo.fipe_mes_referencia} />
          <Info label="Mês aquisição"   value={veiculo.mes_aquisicao} />
        </div>
      </Card>

      <Card title="Operação inicial" className="lg:col-span-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Info label="Horímetro inicial"     value={veiculo.horimetro_inicial} />
          <Info label="Quilometragem inicial" value={veiculo.quilometragem_inicial} />
          <div>
            <p className="text-xs uppercase text-gray-500 mb-1">Medições ativas</p>
            <div className="flex flex-wrap gap-1">
              {veiculo.tipo_hr && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">Horímetro</span>}
              {veiculo.tipo_km && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Hodômetro</span>}
              {veiculo.tipo_tempo && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">Tempo</span>}
              {!veiculo.tipo_hr && !veiculo.tipo_km && !veiculo.tipo_tempo && <span className="text-gray-400">—</span>}
            </div>
          </div>
        </div>
      </Card>

      {veiculo.locacao_atual && (
        <Card title="Locação atual" className="lg:col-span-3 bg-amber-50 border-amber-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Info label="Obra destino" value={veiculo.locacao_atual.obra_destino?.nome_fantasia} />
            <Info label="Data início" value={fmtData(veiculo.locacao_atual.data_inicio)} />
            <Info label="Previsão devolução" value={fmtData(veiculo.locacao_atual.data_prevista)} />
            <Info label="Tipo" value={veiculo.locacao_atual.tipo_veiculo} />
          </div>
        </Card>
      )}

      {veiculo.observacao && (
        <Card title="Observação" className="lg:col-span-3">
          <p className="whitespace-pre-wrap text-gray-700">{veiculo.observacao}</p>
        </Card>
      )}
    </div>
  );
}

/* ============ TAB: Galeria ============ */
function TabGaleria({ veiculo }) {
  const inputRef = useRef(null);
  const upload = useForm({ imagens: [] });

  const enviar = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    upload.setData('imagens', files);
    upload.post(route('admin.frota.veiculos.imagens.store', veiculo.id), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        upload.reset();
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  };

  const remover = (img) => {
    if (!confirm('Remover esta imagem?')) return;
    router.delete(route('admin.frota.veiculos.imagens.destroy', img.id), { preserveScroll: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Galeria ({veiculo.imagens?.length ?? 0})</h2>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" multiple ref={inputRef} onChange={enviar} className="text-sm" />
          {upload.processing && <span className="text-sm text-gray-500">Enviando...</span>}
        </div>
      </div>

      {veiculo.imagens?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {veiculo.imagens.map((img) => (
            <div key={img.id} className="relative group">
              <img src={route('admin.frota.veiculos.imagens.view', [veiculo.id, img.id])} alt="" className="w-full h-32 object-cover rounded border" />
              <button
                onClick={() => remover(img)}
                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
              >
                Remover
              </button>
              {img.descricao && <p className="text-xs text-gray-600 mt-1 truncate">{img.descricao}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Nenhuma imagem na galeria.</p>
      )}
    </div>
  );
}

/* ============ TAB: Docs (Técnicos / Legais) ============ */
function TabDocs({ tipo, registros, veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const isLegal = tipo === 'legais';
  const routeNamePrefix = isLegal ? 'docs-legais' : 'docs-tecnicos';
  const anexoTipo = isLegal ? 'doc-legal' : 'doc-tecnico';

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (d) => { setEditando(d); setShowForm(true); };
  const excluir = (d) => {
    if (!confirm('Remover este documento?')) return;
    router.delete(route(`admin.frota.${routeNamePrefix}.destroy`, d.id), { preserveScroll: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Documentos {tipo}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{registros.length} registros</span>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1 rounded text-sm hover:bg-rise-700">+ Novo documento</button>
        </div>
      </div>

      {showForm && (
        <ModalDoc veiculo={veiculo} doc={editando} tipo={tipo} onClose={() => setShowForm(false)} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Nome do documento</th>
              <th className="px-3 py-2">Data documento</th>
              <th className="px-3 py-2">Data validade</th>
              <th className="px-3 py-2">Restam</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registros.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum documento cadastrado.</td></tr>
            ) : registros.map((d) => {
              const v = corValidade(d.diferenca_dias);
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">#{d.id}</td>
                  <td className="px-3 py-2 font-medium">{d.nome_documento || '—'}</td>
                  <td className="px-3 py-2">{fmtData(d.data_documento)}</td>
                  <td className="px-3 py-2">{fmtData(d.data_validade)}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${v.cor}`}>{v.label}</span></td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    {d.arquivo && (
                      <a href={route('admin.frota.anexos.view', [anexoTipo, d.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Abrir</a>
                    )}
                    <button onClick={() => abrirEdit(d)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(d)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalDoc({ veiculo, doc, tipo, onClose }) {
  const editando = !!doc?.id;
  const isLegal = tipo === 'legais';
  const routePrefix = isLegal ? 'docs-legais' : 'docs-tecnicos';
  const subfolder = isLegal ? 'docs_legais' : 'docs_tecnicos';

  const { data, setData, post, processing, errors } = useForm({
    nome_documento: doc?.nome_documento ?? '',
    data_documento: doc?.data_documento?.substring(0, 10) ?? '',
    data_validade:  doc?.data_validade?.substring(0, 10) ?? '',
    status:         doc?.status ?? 'Ativo',
    arquivo:        null,
    _method:        editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route(`admin.frota.${routePrefix}.update`, doc.id)
      : route(`admin.frota.veiculos.${routePrefix}.store`, veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: onClose });
  };

  return (
    <ModalShell title={editando ? `Editar documento #${doc.id}` : `Novo documento ${tipo}`} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3" encType="multipart/form-data">
        <F label="Nome do documento *" name="nome_documento" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Data do documento" name="data_documento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Data de validade" name="data_validade" type="date" data={data} setData={setData} errors={errors} />
        <F label="Status" name="status" errors={errors}>
          <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={inputCls}>
            <option>Ativo</option>
            <option>Inativo</option>
            <option>Vencido</option>
          </select>
        </F>
        <FileFieldOneDrive label="Arquivo (PDF / imagem)" subfolder={`${subfolder}/${doc?.id ?? 'novo'}`} setData={setData} errors={errors} veiculo={veiculo} className="md:col-span-2" />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ Helpers de Modal ============ */
function ModalShell({ title, onClose, children, large = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${large ? 'max-w-4xl' : 'max-w-2xl'} my-4`} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, processing, editando }) {
  return (
    <div className="md:col-span-3 flex justify-end gap-2 border-t pt-4 mt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
      <button type="submit" disabled={processing}
              className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
        {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
      </button>
    </div>
  );
}

function FileFieldOneDrive({ label, subfolder, setData, errors, veiculo, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      <input type="file" onChange={(e) => setData('arquivo', e.target.files[0] ?? null) || setData('anexo', e.target.files[0] ?? null)} className="text-sm" accept="image/*,.pdf" />
      <p className="text-xs text-gray-500 mt-1">Vai para o OneDrive em veiculos/{veiculo.id}/{subfolder}/</p>
      {(errors?.arquivo || errors?.anexo) && <p className="text-red-600 text-xs mt-1">{errors.arquivo || errors.anexo}</p>}
    </div>
  );
}

/* ============ TAB: Corretivas ============ */
function TabCorretivas({ veiculo, registros, fornecedores = [] }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (m) => { setEditando(m); setShowForm(true); };
  const excluir = (m) => {
    if (!confirm('Remover esta manutenção?')) return;
    router.delete(route('admin.frota.manutencoes.destroy', m.id), { preserveScroll: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Manutenções corretivas</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{registros.length} registros</span>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1 rounded text-sm hover:bg-rise-700">+ Nova manutenção</button>
        </div>
      </div>

      {showForm && (
        <ModalCorretiva veiculo={veiculo} manutencao={editando} fornecedores={fornecedores} onClose={() => setShowForm(false)} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">{veiculo.tipo_hr ? 'Hr' : 'Km'}</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">Início</th>
              <th className="px-3 py-2">Conclusão</th>
              <th className="px-3 py-2">Garantia</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registros.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-500 py-6">Nenhuma manutenção registrada.</td></tr>
            ) : registros.map((m) => {
              const s = situacaoCorretiva[m.situacao] ?? { label: '—', cor: 'bg-gray-200 text-gray-700' };
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">#{m.id}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${s.cor}`}>{s.label}</span></td>
                  <td className="px-3 py-2">{veiculo.tipo_hr ? m.horimetro_atual : m.quilometragem_atual}</td>
                  <td className="px-3 py-2 text-xs">{m.fornecedor?.nome_fantasia ?? '—'}</td>
                  <td className="px-3 py-2">{fmtData(m.data_de_execucao)}</td>
                  <td className="px-3 py-2">{fmtData(m.data_conclusao)}</td>
                  <td className="px-3 py-2">{fmtData(m.data_de_vencimento)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(m.valor_do_servico)}</td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    {m.arquivo && (
                      <a href={route('admin.frota.anexos.view', ['manutencao', m.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition">Anexo</a>
                    )}
                    <button onClick={() => abrirEdit(m)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                    <button onClick={() => excluir(m)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalCorretiva({ veiculo, manutencao, fornecedores, onClose }) {
  const editando = !!manutencao?.id;
  const { data, setData, post, processing, errors } = useForm({
    fornecedor_id:         manutencao?.fornecedor_id ?? '',
    tipo:                  manutencao?.tipo ?? '',
    situacao:              manutencao?.situacao ?? 1,
    valor_do_servico:      manutencao?.valor_do_servico ?? '',
    quilometragem_atual:   manutencao?.quilometragem_atual ?? '',
    quilometragem_nova:    manutencao?.quilometragem_nova ?? '',
    horimetro_atual:       manutencao?.horimetro_atual ?? '',
    horimetro_proximo:     manutencao?.horimetro_proximo ?? '',
    data_de_execucao:      manutencao?.data_de_execucao?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    data_previsao_termino: manutencao?.data_previsao_termino?.substring(0, 10) ?? '',
    data_conclusao:        manutencao?.data_conclusao?.substring(0, 10) ?? '',
    data_de_vencimento:    manutencao?.data_de_vencimento?.substring(0, 10) ?? '',
    descricao:             manutencao?.descricao ?? '',
    arquivo:               null,
    _method:               editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.manutencoes.update', manutencao.id)
      : route('admin.frota.veiculos.manutencoes.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: onClose });
  };

  return (
    <ModalShell title={editando ? `Editar manutenção #${manutencao.id}` : 'Nova manutenção corretiva'} onClose={onClose} large>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3" encType="multipart/form-data">
        <F label="Situação *" name="situacao" errors={errors}>
          <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)} className={inputCls}>
            <option value="1">Pendente</option>
            <option value="2">Em Execução</option>
            <option value="3">Concluído</option>
            <option value="4">Cancelado</option>
          </select>
        </F>
        <F label="Fornecedor" name="fornecedor_id" errors={errors}>
          <select value={data.fornecedor_id} onChange={(e) => setData('fornecedor_id', e.target.value)} className={inputCls}>
            <option value="">— selecione —</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
          </select>
        </F>
        <F label="Tipo de serviço" name="tipo" data={data} setData={setData} errors={errors} />

        {veiculo.tipo_hr ? (
          <>
            <F label="Horímetro atual" name="horimetro_atual" type="number" data={data} setData={setData} errors={errors} />
            <F label="Horímetro próximo" name="horimetro_proximo" type="number" data={data} setData={setData} errors={errors} />
            <div></div>
          </>
        ) : (
          <>
            <F label="Km atual" name="quilometragem_atual" type="number" data={data} setData={setData} errors={errors} />
            <F label="Km próximo" name="quilometragem_nova" type="number" data={data} setData={setData} errors={errors} />
            <div></div>
          </>
        )}

        <F label="Data de execução" name="data_de_execucao" type="date" data={data} setData={setData} errors={errors} />
        <F label="Previsão de término" name="data_previsao_termino" type="date" data={data} setData={setData} errors={errors} />
        <F label="Data de conclusão" name="data_conclusao" type="date" data={data} setData={setData} errors={errors} />

        <F label="Garantia (vencimento)" name="data_de_vencimento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Valor do serviço (R$)" name="valor_do_servico" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <div></div>

        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Descrição</label>
          <textarea rows={3} value={data.descricao} onChange={(e) => setData('descricao', e.target.value)} className={inputCls} />
        </div>

        <FileFieldOneDrive label="Anexo (NF, comprovante)" subfolder={`manutencoes/${manutencao?.id ?? 'novo'}`} setData={setData} errors={errors} veiculo={veiculo} className="md:col-span-3" />

        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Preventivas (Dashboard de Ciclos + Histórico) ============ */
function TabPreventivas({ dashboard, historico, veiculo, registros, fornecedores = [] }) {
  const [cicloParaOs, setCicloParaOs] = useState(null);

  if (!dashboard || dashboard.ciclos.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Dashboard de Preventivas (Ciclos)</h2>
        <p className="text-gray-500 text-sm bg-amber-50 border border-amber-200 p-3 rounded">
          Este veículo ainda não tem itens de preventiva cadastrados. Cadastre os ciclos no plano de preventiva para ver o dashboard.
        </p>
        {registros.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Planos cadastrados</h3>
            <ul className="list-disc pl-5 text-sm">
              {registros.map((p) => <li key={p.id}>{p.nome_preventiva}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const { medicao_atual, unidade, ciclos } = dashboard;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold uppercase text-gray-600">
          <span className="mr-2">⚠</span> Dashboard de Preventivas (Ciclos)
        </h2>
        <span className="text-sm text-gray-500">
          Medição atual: <strong>{Number(medicao_atual).toLocaleString('pt-BR')} {unidade}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ciclos.map((c) => (
          <CicloCard
            key={c.periodo}
            ciclo={c}
            unidade={unidade}
            medicaoAtual={medicao_atual}
            onCadastrar={() => setCicloParaOs(c)}
          />
        ))}
      </div>

      {cicloParaOs && (
        <ModalOsPreventiva
          veiculo={veiculo}
          ciclo={cicloParaOs}
          medicaoAtual={medicao_atual}
          unidade={unidade}
          fornecedores={fornecedores}
          onClose={() => setCicloParaOs(null)}
        />
      )}

      <div className="bg-white border rounded-lg mt-6">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold">📜 Histórico de OS Preventivas</h3>
          <span className="text-sm text-gray-500">{historico.length} execuções</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 w-16">ID</th>
                <th className="px-3 py-2">Ciclo</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2 text-right">Atual</th>
                <th className="px-3 py-2 text-right">Próxima</th>
                <th className="px-3 py-2">Início</th>
                <th className="px-3 py-2">Conclusão</th>
                <th className="px-3 py-2">Vencimento</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {historico.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-500 py-6">Nenhuma OS preventiva executada.</td></tr>
              ) : historico.map((h) => {
                const cicloLabel = veiculo.tipo_hr ? h.campo_cal_hr : h.campo_calc_km;
                const atual = veiculo.tipo_hr ? h.horimetro_atual : h.quilometragem_atual;
                const prox  = veiculo.tipo_hr ? h.horimetro_proximo : h.quilometragem_nova;
                const sit = situacaoCorretiva[h.status_realizado] ?? { label: h.status_realizado || '—', cor: 'bg-gray-200 text-gray-700' };
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">#{h.id}</td>
                    <td className="px-3 py-2 font-medium">{cicloLabel ? `${fmtNum(cicloLabel)} ${unidade}` : '—'}</td>
                    <td className="px-3 py-2">{h.motorista?.nome ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(atual)} {unidade}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(prox)} {unidade}</td>
                    <td className="px-3 py-2">{fmtData(h.data_de_execucao)}</td>
                    <td className="px-3 py-2">{fmtData(h.data_conclusao)}</td>
                    <td className="px-3 py-2">{fmtData(h.data_de_vencimento)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${sit.cor}`}>{sit.label}</span></td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtMoney(h.total_valor_servico)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CicloCard({ ciclo, unidade, medicaoAtual, onCadastrar }) {
  const { periodo, alvo, distancia, progresso, data_ultima, data_vencimento, estado, bloqueio, qtd_itens } = ciclo;

  const palette = {
    mestre:              { borda: 'border-rise-500 ring-2 ring-rise-300', barra: 'bg-rise-500', titulo: 'text-rise-700', icone: '✅' },
    bloqueado_por_maior: { borda: 'border-gray-300', barra: 'bg-gray-300', titulo: 'text-gray-500', icone: '🔒' },
    vencido:             { borda: 'border-red-500', barra: 'bg-red-500', titulo: 'text-red-600', icone: '⚠' },
    aguardando:          { borda: 'border-blue-300', barra: 'bg-blue-400', titulo: 'text-blue-700', icone: '🔧' },
  };
  const p = palette[estado] ?? palette.aguardando;

  return (
    <div className={`bg-white border-t-4 ${p.borda} rounded-lg shadow-sm border-x border-b p-4 flex flex-col`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold">Ciclo {fmtNum(periodo)} {unidade}</p>
          <p className={`text-lg font-bold ${p.titulo}`}>
            {estado === 'vencido' && 'Vencido'}
            {estado === 'mestre' && 'Próximo!'}
            {estado === 'bloqueado_por_maior' && 'Aguarda OS maior'}
            {estado === 'aguardando' && (
              <>
                {fmtNum(distancia)} <span className="text-xs text-gray-500 font-normal">{unidade} faltantes</span>
              </>
            )}
          </p>
        </div>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${p.barra} bg-opacity-20`}>{p.icone}</span>
      </div>

      <div className="my-2">
        <div className="h-2 bg-gray-100 rounded">
          <div className={`h-2 ${p.barra} rounded ${estado === 'mestre' ? 'animate-pulse' : ''}`} style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Atual: {fmtNum(medicaoAtual)}</span>
          <span>Target: {fmtNum(alvo)}</span>
        </div>
      </div>

      <div className="border-t pt-2 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Última Exec:</span>
          <span className="font-medium">{data_ultima ? fmtData(data_ultima) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Prev. Data:</span>
          <span className="font-medium">{data_vencimento ? fmtData(data_vencimento) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Itens no ciclo:</span>
          <span className="font-medium">{qtd_itens}</span>
        </div>
      </div>

      <div className="mt-3">
        {estado === 'mestre' ? (
          <button
            onClick={onCadastrar}
            className="w-full bg-rise-600 text-white py-2 rounded font-semibold hover:bg-rise-700 animate-pulse"
          >
            🔧 Cadastrar OS
          </button>
        ) : (
          <button disabled className="w-full bg-gray-100 text-gray-500 py-2 rounded text-xs border cursor-not-allowed">
            🔒 {bloqueio}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============ TAB: Seguros ============ */
function TabSeguros({ registros, veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (s) => { setEditando(s); setShowForm(true); };
  const excluir = (s) => {
    if (!confirm('Remover este seguro?')) return;
    router.delete(route('admin.frota.seguros.destroy', s.id), { preserveScroll: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Seguros</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{registros.length} apólices</span>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1 rounded text-sm hover:bg-rise-700">+ Novo seguro</button>
        </div>
      </div>

      {showForm && (
        <ModalSeguro veiculo={veiculo} seguro={editando} onClose={() => setShowForm(false)} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Seguradora</th>
              <th className="px-3 py-2 text-right">Custo</th>
              <th className="px-3 py-2">Carência Inicial</th>
              <th className="px-3 py-2">Carência Final</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registros.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum seguro cadastrado.</td></tr>
            ) : registros.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{s.id}</td>
                <td className="px-3 py-2 font-medium">{s.nome_seguradora || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(s.valor)}</td>
                <td className="px-3 py-2">{fmtData(s.carencia_inicial)}</td>
                <td className="px-3 py-2">{fmtData(s.carencia_final)}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => abrirEdit(s)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(s)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalSeguro({ veiculo, seguro, onClose }) {
  const editando = !!seguro?.id;
  const { data, setData, post, put, processing, errors } = useForm({
    nome_seguradora:  seguro?.nome_seguradora ?? '',
    valor:            seguro?.valor ?? '',
    carencia_inicial: seguro?.carencia_inicial?.substring(0, 10) ?? '',
    carencia_final:   seguro?.carencia_final?.substring(0, 10) ?? '',
  });

  const submit = (e) => {
    e.preventDefault();
    if (editando) put(route('admin.frota.seguros.update', seguro.id), { preserveScroll: true, onSuccess: onClose });
    else post(route('admin.frota.veiculos.seguros.store', veiculo.id), { preserveScroll: true, onSuccess: onClose });
  };

  return (
    <ModalShell title={editando ? `Editar seguro #${seguro.id}` : 'Novo seguro'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <F label="Seguradora *" name="nome_seguradora" data={data} setData={setData} errors={errors} className="md:col-span-2" />
        <F label="Valor (R$)" name="valor" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <div></div>
        <F label="Carência inicial" name="carencia_inicial" type="date" data={data} setData={setData} errors={errors} />
        <F label="Carência final" name="carencia_final" type="date" data={data} setData={setData} errors={errors} />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: IPVAs ============ */
function TabIpvas({ registros, veiculo }) {
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const abrirNovo = () => { setEditando(null); setShowForm(true); };
  const abrirEdit = (i) => { setEditando(i); setShowForm(true); };
  const excluir = (i) => {
    if (!confirm('Remover este IPVA?')) return;
    router.delete(route('admin.frota.ipvas.destroy', i.id), { preserveScroll: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">IPVAs</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{registros.length} anos</span>
          <button onClick={abrirNovo} className="bg-rise-600 text-white px-3 py-1 rounded text-sm hover:bg-rise-700">+ Novo IPVA</button>
        </div>
      </div>

      {showForm && (
        <ModalIpva veiculo={veiculo} ipva={editando} onClose={() => setShowForm(false)} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Ano</th>
              <th className="px-3 py-2 text-right">Custo</th>
              <th className="px-3 py-2">Pagamento</th>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Anexo</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registros.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">Nenhum IPVA cadastrado.</td></tr>
            ) : registros.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{i.id}</td>
                <td className="px-3 py-2 font-medium">{i.referencia_ano || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(i.valor)}</td>
                <td className="px-3 py-2">{fmtData(i.data_de_pagamento)}</td>
                <td className="px-3 py-2">{fmtData(i.data_de_vencimento)}</td>
                <td className="px-3 py-2 text-xs">
                  {i.nome_anexo_ipva
                    ? <a href={route('admin.frota.anexos.view', ['ipva', i.id])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Abrir</a>
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => abrirEdit(i)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition">Editar</button>
                  <button onClick={() => excluir(i)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalIpva({ veiculo, ipva, onClose }) {
  const editando = !!ipva?.id;
  const { data, setData, post, processing, errors } = useForm({
    referencia_ano:     ipva?.referencia_ano ?? new Date().getFullYear().toString(),
    valor:              ipva?.valor ?? '',
    data_de_pagamento:  ipva?.data_de_pagamento?.substring(0, 10) ?? '',
    data_de_vencimento: ipva?.data_de_vencimento?.substring(0, 10) ?? '',
    anexo:              null,
    _method:            editando ? 'put' : 'post',
  });

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.ipvas.update', ipva.id)
      : route('admin.frota.veiculos.ipvas.store', veiculo.id);
    post(url, { forceFormData: true, preserveScroll: true, onSuccess: onClose });
  };

  return (
    <ModalShell title={editando ? `Editar IPVA #${ipva.id}` : 'Novo IPVA'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3" encType="multipart/form-data">
        <F label="Ano de referência *" name="referencia_ano" data={data} setData={setData} errors={errors} />
        <F label="Valor (R$)" name="valor" type="number" step="0.01" data={data} setData={setData} errors={errors} />
        <F label="Data de pagamento" name="data_de_pagamento" type="date" data={data} setData={setData} errors={errors} />
        <F label="Data de vencimento" name="data_de_vencimento" type="date" data={data} setData={setData} errors={errors} />
        <FileFieldOneDrive label="Anexo (NF/comprovante)" subfolder={`ipvas/${ipva?.id ?? 'novo'}`} setData={setData} errors={errors} veiculo={veiculo} className="md:col-span-2" />
        <ModalFooter onClose={onClose} processing={processing} editando={editando} />
      </form>
    </ModalShell>
  );
}

/* ============ TAB: Abastecimentos ============ */
function TabAbastecimentos({ veiculo, registros }) {
  const totalLitros = registros.reduce((acc, a) => acc + Number(a.quantidade || 0), 0);
  const totalGasto  = registros.reduce((acc, a) => acc + Number(a.valor_total || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Histórico de abastecimentos</h2>
        <span className="text-sm text-gray-500">{registros.length} registros</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Kpi label="Total de litros" value={fmtNum(totalLitros, 2)} />
        <Kpi label="Total gasto" value={fmtMoney(totalGasto)} />
        <Kpi label="# Abastecimentos" value={registros.length} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Combustível</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'Hr ant.' : 'Km ant.'}</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'Hr atual' : 'Km atual'}</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'Trab.' : 'Percorr.'}</th>
              <th className="px-3 py-2 text-right">Qtde.</th>
              <th className="px-3 py-2 text-right">R$/L</th>
              <th className="px-3 py-2 text-right">{veiculo.tipo_hr ? 'R$/hr' : 'R$/km'}</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right text-rise-700">CO₂</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registros.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-gray-500 py-6">Nenhum abastecimento.</td></tr>
            ) : registros.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">#{a.id}</td>
                <td className="px-3 py-2">{fmtData(a.data_abastecimento)}</td>
                <td className="px-3 py-2 uppercase text-xs">{a.combustivel || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtNum(a.medicao_inicial)}</td>
                <td className="px-3 py-2 text-right">{fmtNum(a.medicao_final)}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtNum(a.percorrido)} {veiculo.tipo_hr ? 'hr' : 'km'}</td>
                <td className="px-3 py-2 text-right">{fmtNum(a.quantidade, 2)} L</td>
                <td className="px-3 py-2 text-right">{fmtMoney(a.custo_por_litro)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(a.custo_por_km)}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtMoney(a.valor_total)}</td>
                <td className="px-3 py-2 text-right text-rise-700">{fmtNum(a.emissao_carbono, 2)} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ TAB: Medições (hodômetro/horímetro) ============ */
function TabMedicoes({ veiculo, registros }) {
  const unidade = veiculo.tipo_hr ? 'hr' : 'km';
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{veiculo.tipo_hr ? 'Horímetros' : 'Hodômetros'}</h2>
        <span className="text-sm text-gray-500">{registros.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 w-16">ID</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">Anterior</th>
              <th className="px-3 py-2 text-right">Novo</th>
              <th className="px-3 py-2 text-right">Δ</th>
              <th className="px-3 py-2">Cadastrado por</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {registros.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">Sem medições.</td></tr>
            ) : registros.map((m) => {
              const ant = veiculo.tipo_hr ? m.horimetro_atual : m.quilometragem_atual;
              const novo = veiculo.tipo_hr ? m.horimetro_novo : m.quilometragem_nova;
              const data = veiculo.tipo_hr ? m.data_horimetro : m.data_quilometragem;
              const delta = (ant != null && novo != null) ? (novo - ant) : null;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">#{m.id}</td>
                  <td className="px-3 py-2">{fmtData(data)}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(ant)} {unidade}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtNum(novo)} {unidade}</td>
                  <td className="px-3 py-2 text-right text-rise-700">{delta != null ? `+${fmtNum(delta)} ${unidade}` : '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{m.user_create || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Modal: Cadastrar OS Preventiva ============ */
function ModalOsPreventiva({ veiculo, ciclo, medicaoAtual, unidade, fornecedores, onClose }) {
  const proxAutoTarget = ciclo.alvo + ciclo.periodo; // sugere prox alvo = atual+periodo
  const hoje = new Date().toISOString().substring(0, 10);

  const { data, setData, post, processing, errors, reset } = useForm({
    periodo:            ciclo.periodo,
    medicao_proxima:    proxAutoTarget,
    data_de_execucao:   hoje,
    data_conclusao:     '',
    data_de_vencimento: '',
    fornecedor_id:      '',
    nf_pecas:           '',
    nf_mao_obra:        '',
    valor_do_servico:   '',
    valor_da_mao_obra:  '',
    tipo:               '',
    descricao:          '',
    anexo:              null,
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('admin.frota.veiculos.os-preventiva.store', veiculo.id), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => { reset(); onClose(); },
    });
  };

  const totalCalc = (Number(data.valor_do_servico || 0) + Number(data.valor_da_mao_obra || 0))
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Cadastrar OS Preventiva — Ciclo {ciclo.periodo.toLocaleString('pt-BR')} {unidade}</h2>
            <p className="text-sm text-gray-500">{veiculo.prefixo} · medição atual: <strong>{medicaoAtual.toLocaleString('pt-BR')} {unidade}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </header>

        <form onSubmit={submit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3" encType="multipart/form-data">
          <F label={`Próxima medição alvo (${unidade}) *`} name="medicao_proxima" type="number" data={data} setData={setData} errors={errors} />
          <F label="Data de execução *" name="data_de_execucao" type="date" data={data} setData={setData} errors={errors} />
          <F label="Data de conclusão" name="data_conclusao" type="date" data={data} setData={setData} errors={errors} />

          <F label="Fornecedor" name="fornecedor_id" errors={errors}>
            <select value={data.fornecedor_id} onChange={(e) => setData('fornecedor_id', e.target.value)} className={inputCls}>
              <option value="">— selecione —</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
            </select>
          </F>

          <F label="Tipo de serviço" name="tipo" data={data} setData={setData} errors={errors} placeholder="Ex: Troca de óleo" />
          <F label="Vencimento (próxima)" name="data_de_vencimento" type="date" data={data} setData={setData} errors={errors} />

          <F label="NF Peças" name="nf_pecas" data={data} setData={setData} errors={errors} />
          <F label="NF Mão de obra" name="nf_mao_obra" data={data} setData={setData} errors={errors} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Total calculado</label>
            <p className="border border-gray-200 rounded px-3 py-2 bg-gray-50 font-bold">{totalCalc}</p>
          </div>

          <F label="Valor do serviço (R$)" name="valor_do_servico" type="number" step="0.01" data={data} setData={setData} errors={errors} />
          <F label="Valor da mão de obra (R$)" name="valor_da_mao_obra" type="number" step="0.01" data={data} setData={setData} errors={errors} />
          <div></div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Descrição</label>
            <textarea rows={3} value={data.descricao} onChange={(e) => setData('descricao', e.target.value)} className={inputCls} />
            {errors.descricao && <p className="text-red-600 text-xs mt-1">{errors.descricao}</p>}
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Anexo (NF, comprovante)</label>
            <input type="file" onChange={(e) => setData('anexo', e.target.files[0] ?? null)} className="text-sm" accept="image/*,.pdf" />
            <p className="text-xs text-gray-500 mt-1">Arquivo vai pro OneDrive em veiculos/{veiculo.id}/preventivas/</p>
            {errors.anexo && <p className="text-red-600 text-xs mt-1">{errors.anexo}</p>}
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 border-t pt-4 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={processing}
                    className="px-6 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50">
              {processing ? 'Salvando...' : 'Cadastrar OS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-rise-500 focus:border-rise-500';

function F({ label, name, type = 'text', step, placeholder, data, setData, errors, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">{label}</label>
      {children ?? (
        <input type={type} step={step} placeholder={placeholder}
               value={data?.[name] ?? ''} onChange={(e) => setData(name, e.target.value)}
               className={inputCls} />
      )}
      {errors?.[name] && <p className="text-red-600 text-xs mt-1">{errors[name]}</p>}
    </div>
  );
}

/* ============ helpers de UI ============ */
function Card({ title, className = '', children }) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value, mono = false, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`font-semibold ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-400">—</span>}
      </p>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg border p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
