import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Formulário de Locação — porta o legacy form.blade.php:
 *   - Selects pesquisáveis (estilo Select2) para veículo, obras e condutores.
 *   - Cards laterais com foto do condutor de origem, condutor de destino
 *     e do veículo, atualizados via AJAX ao trocar os selects.
 *   - Campos read-only "Placa/Modelo" e "Descrição" preenchidos a partir
 *     do veículo selecionado.
 */
export default function LocacaoForm({ locacao, veiculos, obras, funcionarios }) {
  const editando = !!locacao?.id;

  const { data, setData, post, put, processing, errors } = useForm({
    veiculo_id:             locacao?.veiculo_id ?? '',
    id_obra:                locacao?.id_obra ?? '',
    id_obraDestino:         locacao?.id_obraDestino ?? '',
    id_funcionario:         locacao?.id_funcionario ?? '',
    id_funcionario_destino: locacao?.id_funcionario_destino ?? '',
    tipo_veiculo:           locacao?.tipo_veiculo ?? '',
    data_inicio:            locacao?.data_inicio?.substring(0, 10) ?? '',
    data_prevista:          locacao?.data_prevista?.substring(0, 10) ?? '',
    data_fim:               locacao?.data_fim?.substring(0, 10) ?? '',
  });

  /* ====== Opções formatadas para o SearchSelect ====== */
  const optsVeiculos = useMemo(
    () => veiculos.map((v) => ({
      value: v.id,
      label: `${v.prefixo}${v.placa ? ` (${v.placa})` : ''}`,
      sub:   [v.marca, v.modelo].filter(Boolean).join(' '),
      raw:   v,
    })),
    [veiculos]
  );
  const optsObras = useMemo(
    () => obras.map((o) => ({
      value: o.id,
      label: o.codigo_obra ? `${o.codigo_obra} — ${o.nome_fantasia}` : o.nome_fantasia,
      sub:   '',
      raw:   o,
    })),
    [obras]
  );
  const optsFuncionarios = useMemo(
    () => funcionarios.map((f) => ({
      value: f.id,
      label: f.nome,
      sub:   '',
      raw:   f,
    })),
    [funcionarios]
  );

  /* ====== Atalhos p/ preview cards ====== */
  const veiculoSel       = useMemo(() => veiculos.find((v) => String(v.id) === String(data.veiculo_id)), [veiculos, data.veiculo_id]);
  const condutorOrigem   = useMemo(() => funcionarios.find((f) => String(f.id) === String(data.id_funcionario)), [funcionarios, data.id_funcionario]);
  const condutorDestino  = useMemo(() => funcionarios.find((f) => String(f.id) === String(data.id_funcionario_destino)), [funcionarios, data.id_funcionario_destino]);

  /* ====== Estado dos previews (atualizado via AJAX no change) ====== */
  const [veiculoData, setVeiculoData] = useState(null);
  const [erroAjax, setErroAjax] = useState(null);

  useEffect(() => {
    if (!data.veiculo_id) { setVeiculoData(null); return; }
    let abort = false;
    setErroAjax(null);
    fetch(route('admin.frota.locacoes.pesquisar-veiculo') + '?id=' + data.veiculo_id, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((j) => { if (!abort) setVeiculoData(j); })
      .catch(() => { if (!abort) setErroAjax('Erro ao carregar dados do veículo'); });
    return () => { abort = true; };
  }, [data.veiculo_id]);

  /* ====== Submit ====== */
  const submit = (e) => {
    e.preventDefault();
    editando
      ? put(route('admin.frota.locacoes.update', locacao.id))
      : post(route('admin.frota.locacoes.store'));
  };

  /* ====== Helpers de render ====== */
  const FieldLabel = ({ label, required, name }) => (
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label}{required && <span className="text-red-500"> *</span>}
      {errors[name] && <span className="text-red-600 text-xs font-normal ml-2">{errors[name]}</span>}
    </label>
  );

  const placaModelo = veiculoData
    ? (veiculoData.tipo_hr ? veiculoData.nun_serie_chassi : veiculoData.placa) ?? '—'
    : (veiculoSel?.placa ?? veiculoSel?.nun_serie_chassi ?? '');

  const descricaoVeiculo = veiculoData?.veiculo ?? veiculoSel?.veiculo ?? '';

  const veiculoImgUrl         = data.veiculo_id             ? route('admin.frota.veiculos.imagem-principal', data.veiculo_id) : null;
  const condutorOrigemImgUrl  = data.id_funcionario         ? route('admin.frota.locacoes.funcionario-foto', data.id_funcionario) : null;
  const condutorDestinoImgUrl = data.id_funcionario_destino ? route('admin.frota.locacoes.funcionario-foto', data.id_funcionario_destino) : null;

  return (
    <AuthenticatedLayout>
      <Head title={editando ? 'Editar locação' : 'Nova locação'} />

      <div className="p-6 w-full">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {editando ? 'Editar locação' : 'Nova locação de veículo'}
            </h1>
            <Link
              href={route('admin.frota.locacoes.index')}
              className="text-sm text-gray-600 hover:underline"
            >
              ← voltar
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* ======================== formulário ======================== */}
          <form
            onSubmit={submit}
            className="xl:col-span-6 bg-white rounded-lg shadow border p-6 space-y-4"
          >
            {/* Linha 1: veículo + placa/série + descrição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel label="Veículo" required name="veiculo_id" />
                <SearchSelect
                  options={optsVeiculos}
                  value={data.veiculo_id}
                  onChange={(v) => setData('veiculo_id', v)}
                  placeholder="Selecione o prefixo…"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Placa/Série</label>
                <input
                  value={placaModelo ?? ''}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <input
                  value={descricaoVeiculo ?? ''}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2"
                />
              </div>
            </div>

            {erroAjax && (
              <div className="text-xs text-red-600">{erroAjax}</div>
            )}

            {/* Linha 2: obras */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <FieldLabel label="Obra de Origem" name="id_obra" />
                <SearchSelect
                  options={optsObras}
                  value={data.id_obra}
                  onChange={(v) => setData('id_obra', v)}
                  placeholder="Buscar obra…"
                />
              </div>
              <div>
                <FieldLabel label="Obra de Destino" name="id_obraDestino" />
                <SearchSelect
                  options={optsObras}
                  value={data.id_obraDestino}
                  onChange={(v) => setData('id_obraDestino', v)}
                  placeholder="Buscar obra…"
                />
              </div>
            </div>

            {/* Linha 3: condutores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <FieldLabel label="Condutor de Origem" name="id_funcionario" />
                <SearchSelect
                  options={optsFuncionarios}
                  value={data.id_funcionario}
                  onChange={(v) => setData('id_funcionario', v)}
                  placeholder="Buscar motorista…"
                />
              </div>
              <div>
                <FieldLabel label="Condutor de Destino" name="id_funcionario_destino" />
                <SearchSelect
                  options={optsFuncionarios}
                  value={data.id_funcionario_destino}
                  onChange={(v) => setData('id_funcionario_destino', v)}
                  placeholder="Buscar motorista…"
                />
              </div>
            </div>

            {/* Linha 4: datas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel label="Data de início" required name="data_inicio" />
                <input
                  type="date"
                  value={data.data_inicio}
                  onChange={(e) => setData('data_inicio', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <FieldLabel label="Previsão de término" name="data_prevista" />
                <input
                  type="date"
                  value={data.data_prevista}
                  onChange={(e) => setData('data_prevista', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <FieldLabel label="Data de término" name="data_fim" />
                <input
                  type="date"
                  value={data.data_fim}
                  onChange={(e) => setData('data_fim', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* Linha 5: tipo */}
            <div>
              <FieldLabel label="Tipo de veículo (opcional)" name="tipo_veiculo" />
              <input
                type="text"
                value={data.tipo_veiculo}
                onChange={(e) => setData('tipo_veiculo', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Link
                href={route('admin.frota.locacoes.index')}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50"
              >
                {processing ? 'Salvando…' : (editando ? 'Atualizar' : 'Cadastrar')}
              </button>
            </div>
          </form>

          {/* ======================== previews ======================== */}
          <PreviewCard titulo="Condutor de origem"  imgUrl={condutorOrigemImgUrl}  nome={condutorOrigem?.nome} />
          <PreviewCard titulo="Condutor de destino" imgUrl={condutorDestinoImgUrl} nome={condutorDestino?.nome} />
          <PreviewCard titulo="Veículo"             imgUrl={veiculoImgUrl}
            nome={veiculoSel ? `${veiculoSel.prefixo}${veiculoSel.placa ? ` (${veiculoSel.placa})` : ''}` : null}
          />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

/* =============================================================
 * SearchSelect — combobox client-side estilo Select2.
 *   - Filtra por label e sub (case-insensitive, ignorando acentos).
 *   - Suporta teclado: ↑ ↓ Enter Esc.
 *   - "Limpar" para zerar a seleção.
 * ============================================================= */
function SearchSelect({ options, value, onChange, placeholder = 'Selecione…' }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [hover, setHover]   = useState(0);
  const wrapRef             = useRef(null);
  const inputRef            = useRef(null);
  const listRef             = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) ?? null,
    [options, value]
  );

  const normalize = (s) => (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) =>
      normalize(o.label).includes(q) || normalize(o.sub).includes(q)
    );
  }, [options, query]);

  // Fecha ao clicar fora
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Foca o input quando abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setHover(0);
    }
  }, [open]);

  // Mantém a opção destacada visível
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${hover}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [hover, open]);

  const escolher = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const limpar = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHover((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHover((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (filtered[hover]) escolher(filtered[hover]); }
    else if (e.key === 'Escape')    { setOpen(false); setQuery(''); }
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Botão / display da seleção */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white flex items-center gap-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-500"
      >
        <span className={`flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && (
          <span
            onClick={limpar}
            role="button"
            tabIndex={-1}
            className="text-gray-400 hover:text-red-600 px-1"
            title="Limpar"
          >
            ✕
          </span>
        )}
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHover(0); }}
              onKeyDown={onKey}
              placeholder="Digite para filtrar…"
              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rise-500"
            />
          </div>

          <ul ref={listRef} className="max-h-64 overflow-y-auto text-sm">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-gray-500">Nenhum resultado.</li>
            ) : filtered.map((opt, i) => (
              <li
                key={opt.value}
                data-idx={i}
                onMouseEnter={() => setHover(i)}
                onClick={() => escolher(opt)}
                className={`px-3 py-2 cursor-pointer flex flex-col ${
                  i === hover ? 'bg-rise-50 text-rise-700' : 'hover:bg-gray-50'
                } ${String(opt.value) === String(value) ? 'font-semibold' : ''}`}
              >
                <span className="truncate">{opt.label}</span>
                {opt.sub && <span className="text-[11px] text-gray-500 truncate">{opt.sub}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PreviewCard({ titulo, imgUrl, nome, objectFit = 'cover' }) {
  return (
    <div className="xl:col-span-2 bg-white rounded-lg shadow border overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 border-b">
        {titulo}
      </div>
      <div className="p-3">
        <div className="w-full aspect-square bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={titulo}
              className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
            />
          ) : (
            <span className="text-xs text-gray-400">sem seleção</span>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-gray-700 border-t pt-2">
          {nome ?? <span className="text-gray-400">Selecione</span>}
        </p>
      </div>
    </div>
  );
}
