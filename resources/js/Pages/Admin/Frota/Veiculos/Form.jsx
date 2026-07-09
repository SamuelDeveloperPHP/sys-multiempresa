import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Admin/Frota/Veiculos/Form — criar/editar veículo.
 *
 * Layout em 2 colunas (form + card de imagem) com a cascata FIPE
 * (Tipo → Marca → Modelo → Ano → auto-preenche Descrição/Valor/Código/Mês).
 * `veiculos.tipo` guarda o id do TiposVeiculo, que é o codigoTipoVeiculo da
 * FIPE (1=carro, 2=moto, 3=caminhão, 4=máquina). Máquina (4) não usa FIPE:
 * marca/modelo/ano vêm dos cadastros locais + horímetro.
 */
const inp = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rise-500 focus:border-rise-500';
const lbl = 'block text-xs font-semibold text-gray-600 mb-0.5';

export default function VeiculoForm({ veiculo, subcategorias: subIni = [], lookups }) {
  const editando = !!veiculo?.id;

  const { data, setData, post, processing, errors } = useForm({
    obra_id: veiculo?.obra_id ?? '',
    id_categoria: veiculo?.id_categoria ?? '',
    id_subcategoria: veiculo?.id_subcategoria ?? '',
    id_preventiva: veiculo?.id_preventiva ?? '',
    prefixo: veiculo?.prefixo ?? '',
    tipo: veiculo?.tipo ? String(veiculo.tipo) : '',
    tipo_km: !!veiculo?.tipo_km,
    tipo_hr: !!veiculo?.tipo_hr,
    tipo_tempo: !!veiculo?.tipo_tempo,
    marca: veiculo?.marca ?? '',
    modelo: veiculo?.modelo ?? '',
    ano: veiculo?.ano ?? '',
    veiculo: veiculo?.veiculo ?? '',
    nun_serie_chassi: veiculo?.nun_serie_chassi ?? '',
    valor_fipe: veiculo?.valor_fipe ?? '',
    valor_aquisicao: veiculo?.valor_aquisicao ?? '',
    valor_mercado: veiculo?.valor_mercado ?? '',
    codigo_fipe: veiculo?.codigo_fipe ?? '',
    fipe_mes_referencia: veiculo?.fipe_mes_referencia ?? '',
    mes_aquisicao: veiculo?.mes_aquisicao ?? '',
    placa: veiculo?.placa ?? '',
    renavam: veiculo?.renavam ?? '',
    quilometragem_inicial: veiculo?.quilometragem_inicial ?? '',
    horimetro_inicial: veiculo?.horimetro_inicial ?? '',
    id_combustivel_padrao: veiculo?.id_combustivel_padrao ?? '',
    observacao: veiculo?.observacao ?? '',
    situacao: veiculo?.situacao ?? 'Ativo',
    imagem: null,
    _method: editando ? 'put' : 'post',
  });

  const [subcategorias, setSubcategorias] = useState(subIni);
  const [imgPreview, setImgPreview] = useState(null);

  // FIPE — códigos selecionados + listas + estados de carga
  const [codMarca, setCodMarca] = useState('');
  const [codModelo, setCodModelo] = useState('');
  const [marcasFipe, setMarcasFipe] = useState([]);
  const [modelosFipe, setModelosFipe] = useState([]);
  const [anosFipe, setAnosFipe] = useState([]);
  const [carreg, setCarreg] = useState({ marcas: false, modelos: false, anos: false, valor: false });

  const isMaquina = String(data.tipo) === '4';
  const usaFipe = ['1', '2', '3'].includes(String(data.tipo));

  // Subcategorias em cascata quando a categoria muda
  useEffect(() => {
    if (!data.id_categoria) {
      setSubcategorias([]);
      if (data.id_subcategoria) setData('id_subcategoria', '');
      return;
    }
    fetch(route('admin.frota.veiculos.subcategorias', data.id_categoria), { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((rows) => {
        setSubcategorias(rows);
        if (data.id_subcategoria && !rows.find((s) => s.id == data.id_subcategoria)) setData('id_subcategoria', '');
      })
      .catch(() => setSubcategorias([]));
  }, [data.id_categoria]); // eslint-disable-line react-hooks/exhaustive-deps

  const fipeGet = (name, params) =>
    window.axios.get(route(`admin.frota.${name}`), { params }).then((r) => r.data);

  const carregarMarcas = (tipo) => {
    if (!['1', '2', '3'].includes(String(tipo))) return;
    setCarreg((c) => ({ ...c, marcas: true }));
    fipeGet('fipe.marcas', { codigoTipoVeiculo: tipo })
      .then((rows) => setMarcasFipe(Array.isArray(rows) ? rows : []))
      .catch(() => setMarcasFipe([]))
      .finally(() => setCarreg((c) => ({ ...c, marcas: false })));
  };

  const onTipo = (v) => {
    setData('tipo', v);
    setMarcasFipe([]); setModelosFipe([]); setAnosFipe([]);
    setCodMarca(''); setCodModelo('');
    carregarMarcas(v);
  };

  const onMarcaFipe = (val, label) => {
    setCodMarca(val); setCodModelo('');
    setData((d) => ({ ...d, marca: label, modelo: '', ano: '', veiculo: '' }));
    setModelosFipe([]); setAnosFipe([]);
    setCarreg((c) => ({ ...c, modelos: true }));
    fipeGet('fipe.modelos', { codigoTipoVeiculo: data.tipo, codigoMarca: val })
      .then((r) => setModelosFipe(r?.Modelos ?? []))
      .catch(() => setModelosFipe([]))
      .finally(() => setCarreg((c) => ({ ...c, modelos: false })));
  };

  const onModeloFipe = (val, label) => {
    setCodModelo(val);
    setData((d) => ({ ...d, modelo: label, ano: '', veiculo: '' }));
    setAnosFipe([]);
    setCarreg((c) => ({ ...c, anos: true }));
    fipeGet('fipe.anos', { codigoTipoVeiculo: data.tipo, codigoMarca: codMarca, codigoModelo: val })
      .then((r) => setAnosFipe(Array.isArray(r) ? r : []))
      .catch(() => setAnosFipe([]))
      .finally(() => setCarreg((c) => ({ ...c, anos: false })));
  };

  const onAnoFipe = (val) => {
    setData('ano', val.slice(0, 4));
    setCarreg((c) => ({ ...c, valor: true }));
    fipeGet('fipe.valor', { codigoTipoVeiculo: data.tipo, codigoMarca: codMarca, codigoModelo: codModelo, ano: val })
      .then((r) => {
        if (!r || !r.Valor) return;
        const valorNum = String(r.Valor).replace(/[R$\s.]/g, '').replace(',', '.');
        setData((d) => ({
          ...d,
          veiculo: r.Modelo ?? d.veiculo,
          valor_fipe: valorNum || d.valor_fipe,
          codigo_fipe: r.CodigoFipe ?? d.codigo_fipe,
          fipe_mes_referencia: r.MesReferencia ?? d.fipe_mes_referencia,
        }));
      })
      .catch(() => {})
      .finally(() => setCarreg((c) => ({ ...c, valor: false })));
  };

  // Máquina: descrição = modelo / ano
  const modelosLocais = useMemo(() => lookups.modelos ?? [], [lookups.modelos]);
  const onImagem = (file) => {
    setData('imagem', file);
    if (file) { const rd = new FileReader(); rd.onloadend = () => setImgPreview(rd.result); rd.readAsDataURL(file); }
    else setImgPreview(null);
  };

  const submit = (e) => {
    e.preventDefault();
    const url = editando ? route('admin.frota.veiculos.update', veiculo.id) : route('admin.frota.veiculos.store');
    post(url, { forceFormData: true });
  };

  const hojeExtenso = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const spinner = <span className="inline-block w-3 h-3 border-2 border-rise-400 border-t-transparent rounded-full animate-spin align-middle" />;

  return (
    <AuthenticatedLayout>
      <Head title={editando ? `Editar: ${veiculo.prefixo}` : 'Novo veículo'} />

      <div className="p-4 md:p-6 w-full">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">{editando ? `Editar veículo: ${veiculo.prefixo}` : 'Cadastro de veículo'}</h1>
          <Link href={route('admin.frota.veiculos.index')} className="text-sm text-gray-600 hover:underline">← voltar para a lista</Link>
        </header>

        <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-4" encType="multipart/form-data">
          {/* ================= Coluna esquerda: dados ================= */}
          <div className="xl:col-span-2 bg-white rounded-lg shadow border p-5 space-y-4">
            {/* Prefixo + tipo de medição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className={lbl}>Prefixo *</label>
                <input value={data.prefixo} onChange={(e) => setData('prefixo', e.target.value)} className={inp} />
                {errors.prefixo && <p className="text-red-600 text-xs mt-0.5">{errors.prefixo}</p>}
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Tipo de medição</label>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={data.tipo_km} onChange={(e) => setData('tipo_km', e.target.checked)} /> km</label>
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={data.tipo_hr} onChange={(e) => setData('tipo_hr', e.target.checked)} /> hr</label>
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={data.tipo_tempo} onChange={(e) => setData('tipo_tempo', e.target.checked)} /> Tempo</label>
                </div>
              </div>
            </div>

            {/* Tipo / Categoria / Subcategoria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Tipo de veículo {carreg.marcas && spinner}</label>
                <select value={data.tipo} onChange={(e) => onTipo(e.target.value)} className={inp}>
                  <option value="">Selecione</option>
                  {(lookups.tipos ?? []).map((t) => <option key={t.id} value={String(t.id)}>{t.nome}</option>)}
                </select>
                {errors.tipo && <p className="text-red-600 text-xs mt-0.5">{errors.tipo}</p>}
              </div>
              <div>
                <label className={lbl}>Categoria</label>
                <select value={data.id_categoria} onChange={(e) => setData('id_categoria', e.target.value)} className={inp}>
                  <option value="">Selecione uma categoria</option>
                  {(lookups.categorias ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome_categoria}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Subcategoria</label>
                <select value={data.id_subcategoria} onChange={(e) => setData('id_subcategoria', e.target.value)} disabled={!data.id_categoria} className={inp + (data.id_categoria ? '' : ' bg-gray-100')}>
                  <option value="">{data.id_categoria ? 'Selecione' : '(escolha a categoria)'}</option>
                  {subcategorias.map((s) => <option key={s.id} value={s.id}>{s.nome_subcategoria}</option>)}
                </select>
              </div>
            </div>

            {/* Marca / Modelo / Ano — FIPE (1/2/3), máquina (4) ou manual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* MARCA */}
              <div>
                <label className={lbl}>{isMaquina ? 'Marca da máq.' : 'Marca'} {carreg.modelos && spinner}</label>
                {usaFipe && marcasFipe.length > 0 ? (
                  <select value={codMarca} onChange={(e) => onMarcaFipe(e.target.value, e.target.selectedOptions[0].text)} className={inp}>
                    <option value="">Selecione a marca</option>
                    {marcasFipe.map((m) => <option key={m.Value} value={m.Value}>{m.Label}</option>)}
                  </select>
                ) : isMaquina ? (
                  <input list="marcas-loc" value={data.marca} onChange={(e) => setData('marca', e.target.value)} className={inp} placeholder="Selecione/digite" />
                ) : (
                  <input value={data.marca} onChange={(e) => setData('marca', e.target.value)} className={inp} placeholder="Marca" />
                )}
                <datalist id="marcas-loc">{(lookups.marcas ?? []).map((m) => <option key={m.id} value={m.marca} />)}</datalist>
              </div>
              {/* MODELO */}
              <div>
                <label className={lbl}>{isMaquina ? 'Descrição / modelo' : 'Modelo'} {carreg.anos && spinner}</label>
                {usaFipe && modelosFipe.length > 0 ? (
                  <select value={codModelo} onChange={(e) => onModeloFipe(e.target.value, e.target.selectedOptions[0].text)} className={inp}>
                    <option value="">Selecione o modelo</option>
                    {modelosFipe.map((m) => <option key={m.Value} value={m.Value}>{m.Label}</option>)}
                  </select>
                ) : isMaquina ? (
                  <input list="modelos-loc" value={data.modelo} onChange={(e) => setData('modelo', e.target.value)} className={inp} placeholder="Selecione/digite" />
                ) : (
                  <input value={data.modelo} onChange={(e) => setData('modelo', e.target.value)} className={inp} placeholder="Modelo" />
                )}
                <datalist id="modelos-loc">{modelosLocais.map((m) => <option key={m.id} value={m.modelo} />)}</datalist>
              </div>
              {/* ANO */}
              <div>
                <label className={lbl}>Ano {carreg.valor && spinner}</label>
                {usaFipe && anosFipe.length > 0 ? (
                  <select onChange={(e) => onAnoFipe(e.target.value)} className={inp} defaultValue="">
                    <option value="">Selecione o ano</option>
                    {anosFipe.map((a) => <option key={a.Value} value={a.Value}>{a.Label}</option>)}
                  </select>
                ) : (
                  <input type="number" value={data.ano} onChange={(e) => setData('ano', e.target.value)} className={inp} placeholder="Ano" />
                )}
              </div>
            </div>

            {usaFipe && marcasFipe.length === 0 && (
              <button type="button" onClick={() => carregarMarcas(data.tipo)} className="text-xs text-rise-700 border border-rise-200 bg-rise-50 rounded px-3 py-1.5 hover:bg-rise-100">
                🔍 Buscar marcas na tabela FIPE
              </button>
            )}

            {/* Descrição / chassi / (máquina: modelo/ano) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Descrição do veículo</label>
                <input value={data.veiculo} onChange={(e) => setData('veiculo', e.target.value)} className={inp} placeholder="Preenchimento automático (FIPE)" />
              </div>
              <div>
                <label className={lbl}>Nº de série ou chassi</label>
                <input value={data.nun_serie_chassi} onChange={(e) => setData('nun_serie_chassi', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Combustível padrão</label>
                <select value={data.id_combustivel_padrao} onChange={(e) => setData('id_combustivel_padrao', e.target.value)} className={inp}>
                  <option value="">— selecione —</option>
                  {(lookups.combustiveis ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {!isMaquina && (
                <div>
                  <label className={lbl}>Valor tb. FIPE (R$)</label>
                  <input type="number" step="0.01" value={data.valor_fipe} onChange={(e) => setData('valor_fipe', e.target.value)} className={inp} />
                </div>
              )}
              <div>
                <label className={lbl}>Valor de aquisição (R$)</label>
                <input type="number" step="0.01" value={data.valor_aquisicao} onChange={(e) => setData('valor_aquisicao', e.target.value)} className={inp} />
              </div>
              {isMaquina && (
                <div>
                  <label className={lbl}>Valor de mercado (R$)</label>
                  <input type="number" step="0.01" value={data.valor_mercado} onChange={(e) => setData('valor_mercado', e.target.value)} className={inp} />
                </div>
              )}
              <div>
                <label className={lbl}>Mês/ano de aquisição</label>
                <input type="month" value={data.mes_aquisicao} onChange={(e) => setData('mes_aquisicao', e.target.value)} className={inp} />
              </div>
            </div>

            {/* FIPE detalhe / DETRAN */}
            {!isMaquina && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Código FIPE</label>
                  <input value={data.codigo_fipe} onChange={(e) => setData('codigo_fipe', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Mês de referência FIPE</label>
                  <input value={data.fipe_mes_referencia} onChange={(e) => setData('fipe_mes_referencia', e.target.value)} className={inp} placeholder="ex.: julho de 2026" />
                </div>
              </div>
            )}

            {/* Placa / Renavam / medição inicial */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {!isMaquina && (
                <>
                  <div>
                    <label className={lbl}>Placa</label>
                    <input value={data.placa} onChange={(e) => setData('placa', e.target.value.toUpperCase())} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Renavam</label>
                    <input value={data.renavam} onChange={(e) => setData('renavam', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Quilometragem inicial</label>
                    <input type="number" value={data.quilometragem_inicial} onChange={(e) => setData('quilometragem_inicial', e.target.value)} className={inp} />
                  </div>
                </>
              )}
              {isMaquina && (
                <div>
                  <label className={lbl}>Horímetro inicial</label>
                  <input type="number" value={data.horimetro_inicial} onChange={(e) => setData('horimetro_inicial', e.target.value)} className={inp} />
                </div>
              )}
            </div>

            {/* Plano de preventiva */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Plano de preventiva</label>
                <select value={data.id_preventiva} onChange={(e) => setData('id_preventiva', e.target.value)} className={inp}>
                  <option value="">— sem plano —</option>
                  {(lookups.preventivas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome_preventiva}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Obra</label>
                <select value={data.obra_id} onChange={(e) => setData('obra_id', e.target.value)} className={inp}>
                  <option value="">— sem obra —</option>
                  {(lookups.obras ?? []).map((o) => <option key={o.id} value={o.id}>{o.nome_fantasia} {o.code ? `(${o.code})` : ''}</option>)}
                </select>
              </div>
            </div>

            {/* Observação / Situação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className={lbl}>Observação</label>
                <textarea rows={4} value={data.observacao} onChange={(e) => setData('observacao', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Situação</label>
                <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)} className={inp}>
                  {(lookups.situacoes ?? ['Ativo', 'Inativo']).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ================= Coluna direita: imagem + ações ================= */}
          <div className="bg-white rounded-lg shadow border p-5 h-fit">
            <div className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center aspect-video">
              {imgPreview || veiculo?.imagem ? (
                <img src={imgPreview ?? route('admin.frota.veiculos.imagem-principal', veiculo.id)} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-300 text-6xl">⊘</span>
              )}
            </div>
            <p className="text-center text-sm text-gray-500 border-t mt-2 pt-2">{hojeExtenso}</p>

            <div className="mt-4">
              <label className={lbl}>Imagem principal</label>
              <input type="file" accept="image/*" onChange={(e) => onImagem(e.target.files[0] ?? null)} className="block w-full text-sm" />
              {errors.imagem && <p className="text-red-600 text-xs mt-0.5">{errors.imagem}</p>}
              <p className="text-xs text-gray-400 mt-1">Máx. 5 MB. Galeria (mais fotos) na tela de detalhes.</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={processing} className="px-5 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50 text-sm font-semibold">
                {processing ? 'Salvando…' : (editando ? 'Atualizar' : 'Salvar')}
              </button>
              <Link href={route('admin.frota.veiculos.index')} className="px-5 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">Cancelar</Link>
            </div>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
