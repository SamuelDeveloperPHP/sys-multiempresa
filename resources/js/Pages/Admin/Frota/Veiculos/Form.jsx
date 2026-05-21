import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Admin/Frota/Veiculos/Form
 * Tela unica para criar e editar veiculos.
 *
 * Props:
 *   veiculo:       null (criar) | objeto Veiculo (editar)
 *   subcategorias: lista pre-carregada da categoria atual (no editar)
 *   lookups:       { obras, categorias, marcas, modelos, preventivas, tipos, situacoes }
 */
export default function VeiculoForm({ veiculo, subcategorias: subcategoriasIniciais = [], lookups }) {
  const editando = !!veiculo?.id;

  const { data, setData, post, processing, errors } = useForm({
    obra_id:            veiculo?.obra_id ?? '',
    id_categoria:       veiculo?.id_categoria ?? '',
    id_subcategoria:    veiculo?.id_subcategoria ?? '',
    id_preventiva:      veiculo?.id_preventiva ?? '',

    prefixo:            veiculo?.prefixo ?? '',
    tipo:               veiculo?.tipo ?? '',
    placa:              veiculo?.placa ?? '',
    marca:              veiculo?.marca ?? '',
    modelo:             veiculo?.modelo ?? '',
    ano:                veiculo?.ano ?? '',
    veiculo:            veiculo?.veiculo ?? '',

    tipo_km:            !!veiculo?.tipo_km,
    tipo_hr:            !!veiculo?.tipo_hr,
    tipo_tempo:         !!veiculo?.tipo_tempo,

    valor_fipe:         veiculo?.valor_fipe ?? '',
    valor_aquisicao:    veiculo?.valor_aquisicao ?? '',
    valor_mercado:      veiculo?.valor_mercado ?? '',
    codigo_fipe:        veiculo?.codigo_fipe ?? '',
    fipe_mes_referencia:veiculo?.fipe_mes_referencia ?? '',
    mes_aquisicao:      veiculo?.mes_aquisicao ?? '',

    nun_serie_chassi:   veiculo?.nun_serie_chassi ?? '',
    renavam:            veiculo?.renavam ?? '',
    horimetro_inicial:  veiculo?.horimetro_inicial ?? '',
    quilometragem_inicial: veiculo?.quilometragem_inicial ?? '',

    observacao:         veiculo?.observacao ?? '',
    situacao:           veiculo?.situacao ?? 'Ativo',

    imagem:             null,
    _method:            editando ? 'put' : 'post',
  });

  const [subcategorias, setSubcategorias] = useState(subcategoriasIniciais);

  // Carrega subcategorias quando a categoria muda (cascade AJAX)
  useEffect(() => {
    if (!data.id_categoria) {
      setSubcategorias([]);
      if (data.id_subcategoria) setData('id_subcategoria', '');
      return;
    }

    fetch(route('admin.frota.veiculos.subcategorias', data.id_categoria), {
      headers: { 'Accept': 'application/json' },
    })
      .then((r) => r.json())
      .then((rows) => {
        setSubcategorias(rows);
        if (data.id_subcategoria && !rows.find((s) => s.id == data.id_subcategoria)) {
          setData('id_subcategoria', '');
        }
      })
      .catch(() => setSubcategorias([]));
  }, [data.id_categoria]);

  const submit = (e) => {
    e.preventDefault();
    const url = editando
      ? route('admin.frota.veiculos.update', veiculo.id)
      : route('admin.frota.veiculos.store');
    post(url, { forceFormData: true });
  };

  return (
    <AuthenticatedLayout>
      <Head title={editando ? `Editar: ${veiculo.prefixo}` : 'Novo veículo'} />

      <div className="p-6 w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">
            {editando ? `Editar veículo: ${veiculo.prefixo}` : 'Novo veículo'}
          </h1>
          <Link href={route('admin.frota.veiculos.index')} className="text-sm text-gray-600 hover:underline">
            ← voltar para a lista
          </Link>
        </header>

        <form onSubmit={submit} className="space-y-6" encType="multipart/form-data">

          {/* === Identificação === */}
          <Section title="Identificação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Prefixo *" name="prefixo" data={data} setData={setData} errors={errors} />

              <Field label="Obra" name="obra_id" errors={errors}>
                <select value={data.obra_id} onChange={(e) => setData('obra_id', e.target.value)} className={inputCls}>
                  <option value="">— sem obra —</option>
                  {lookups.obras.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome_fantasia} {o.code ? `(${o.code})` : ''}</option>
                  ))}
                </select>
              </Field>

              <Field label="Situação" name="situacao" errors={errors}>
                <select value={data.situacao} onChange={(e) => setData('situacao', e.target.value)} className={inputCls}>
                  {lookups.situacoes.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Categoria" name="id_categoria" errors={errors}>
                <select value={data.id_categoria} onChange={(e) => setData('id_categoria', e.target.value)} className={inputCls}>
                  <option value="">— selecione —</option>
                  {lookups.categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome_categoria}</option>
                  ))}
                </select>
              </Field>

              <Field label="Subcategoria" name="id_subcategoria" errors={errors}>
                <select
                  value={data.id_subcategoria}
                  onChange={(e) => setData('id_subcategoria', e.target.value)}
                  disabled={!data.id_categoria}
                  className={inputCls + (data.id_categoria ? '' : ' bg-gray-100')}
                >
                  <option value="">{data.id_categoria ? '— selecione —' : '(escolha uma categoria)'}</option>
                  {subcategorias.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome_subcategoria}</option>
                  ))}
                </select>
              </Field>

              <Field label="Tipo" name="tipo" errors={errors}>
                <select value={data.tipo} onChange={(e) => setData('tipo', e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  <option value="motos">Moto</option>
                  <option value="carros">Carro</option>
                  <option value="caminhoes">Caminhão</option>
                  <option value="maquinas">Máquina</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Field label="Marca" name="marca" errors={errors}>
                <input
                  list="marcas-list"
                  value={data.marca}
                  onChange={(e) => setData('marca', e.target.value)}
                  className={inputCls}
                  placeholder="Digite ou selecione"
                />
                <datalist id="marcas-list">
                  {lookups.marcas.map((m) => <option key={m.id} value={m.marca} />)}
                </datalist>
              </Field>

              <Field label="Modelo" name="modelo" errors={errors}>
                <input
                  list="modelos-list"
                  value={data.modelo}
                  onChange={(e) => setData('modelo', e.target.value)}
                  className={inputCls}
                  placeholder="Digite ou selecione"
                />
                <datalist id="modelos-list">
                  {lookups.modelos.map((m) => <option key={m.id} value={m.modelo} />)}
                </datalist>
              </Field>

              <Field label="Ano" name="ano" type="number" data={data} setData={setData} errors={errors} />

              <div className="md:col-span-3">
                <Field label="Descrição livre do veículo" name="veiculo" data={data} setData={setData} errors={errors} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.tipo_hr} onChange={(e) => setData('tipo_hr', e.target.checked)} />
                <span>Horímetro (máquinas, horas trabalhadas)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.tipo_km} onChange={(e) => setData('tipo_km', e.target.checked)} />
                <span>Hodômetro (km rodado)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.tipo_tempo} onChange={(e) => setData('tipo_tempo', e.target.checked)} />
                <span>Tempo (mensal/calendário)</span>
              </label>
            </div>
          </Section>

          {/* === Documentação === */}
          <Section title="Documentação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Placa" name="placa" data={data} setData={setData} errors={errors} />
              <Field label="Renavam" name="renavam" data={data} setData={setData} errors={errors} />
              <Field label="Nº Série / Chassi" name="nun_serie_chassi" data={data} setData={setData} errors={errors} />
            </div>
          </Section>

          {/* === Valor / FIPE === */}
          <Section title="Valor e FIPE">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Valor FIPE (R$)" name="valor_fipe" type="number" step="0.01" data={data} setData={setData} errors={errors} />
              <Field label="Valor Aquisição (R$)" name="valor_aquisicao" type="number" step="0.01" data={data} setData={setData} errors={errors} />
              <Field label="Valor Mercado (R$)" name="valor_mercado" type="number" step="0.01" data={data} setData={setData} errors={errors} />
              <Field label="Código FIPE" name="codigo_fipe" data={data} setData={setData} errors={errors} />
              <Field label="Mês referência FIPE" name="fipe_mes_referencia" data={data} setData={setData} errors={errors} placeholder="ex: 11/2024" />
              <Field label="Mês aquisição" name="mes_aquisicao" data={data} setData={setData} errors={errors} placeholder="ex: 03/2023" />
            </div>
          </Section>

          {/* === Operação === */}
          <Section title="Operação inicial">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Horímetro inicial" name="horimetro_inicial" type="number" data={data} setData={setData} errors={errors} />
              <Field label="Quilometragem inicial" name="quilometragem_inicial" type="number" data={data} setData={setData} errors={errors} />

              <Field label="Plano de preventiva" name="id_preventiva" errors={errors}>
                <select value={data.id_preventiva} onChange={(e) => setData('id_preventiva', e.target.value)} className={inputCls}>
                  <option value="">— sem plano —</option>
                  {lookups.preventivas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome_preventiva}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* === Observação === */}
          <Section title="Observação">
            <textarea
              rows={3}
              value={data.observacao}
              onChange={(e) => setData('observacao', e.target.value)}
              className={inputCls}
            />
            {errors.observacao && <p className="text-red-600 text-sm mt-1">{errors.observacao}</p>}
          </Section>

          {/* === Imagem === */}
          <Section title="Imagem principal">
            {veiculo?.imagem && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Atual:</p>
                <img src={route('admin.frota.veiculos.imagem-principal', veiculo.id)} alt="" className="max-h-40 rounded border" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setData('imagem', e.target.files[0] ?? null)}
              className="block"
            />
            <p className="text-xs text-gray-500 mt-1">Máx. 5 MB. Para mais imagens (galeria), use a tela de detalhes após salvar.</p>
            {errors.imagem && <p className="text-red-600 text-sm mt-1">{errors.imagem}</p>}
          </Section>

          <div className="flex gap-2 justify-end">
            <Link
              href={route('admin.frota.veiculos.index')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 bg-rise-600 text-white rounded hover:bg-rise-700 disabled:opacity-50"
            >
              {processing ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}

/* ============ helpers de UI ============ */

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-rise-500 focus:border-rise-500';

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, name, type = 'text', step, placeholder, data, setData, errors, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children ?? (
        <input
          type={type}
          step={step}
          placeholder={placeholder}
          value={data[name] ?? ''}
          onChange={(e) => setData(name, e.target.value)}
          className={inputCls}
        />
      )}
      {errors?.[name] && <p className="text-red-600 text-sm mt-1">{errors[name]}</p>}
    </div>
  );
}
