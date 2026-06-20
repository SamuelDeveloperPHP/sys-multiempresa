// resources/js/Pages/Admin/Estoque/Produtos/Form.jsx
// -----------------------------------------------------------------------------
// Cadastro/Edição de produto — layout largo estilo e-commerce.
//   - Classificação do item em destaque (pills) — controla as variações.
//   - Auto-detecta a classificação pela categoria escolhida (EPI/calçado/…).
//   - Selects buscáveis (SearchSelect) para categoria, unidade e fornecedor.
//   - Variações (cor/tamanho) via ChipManager quando o item controla variação.
// -----------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchSelect from '@/Components/SearchSelect';

const UNIDADES = ['UN', 'PC', 'PAR', 'CX', 'PCT', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'SC'];

const TIPOS_ITEM = [
    { value: 'material', label: 'Material comum', icon: 'fa-box', desc: 'Sem variação' },
    { value: 'epi', label: 'EPI', icon: 'fa-helmet-safety', desc: 'Óculos, luva, capacete' },
    { value: 'calcado_seguranca', label: 'Calçado de segurança', icon: 'fa-shoe-prints', desc: 'Botina, sapato' },
    { value: 'epc', label: 'EPC', icon: 'fa-shield-halved', desc: 'Proteção coletiva' },
    { value: 'uniforme', label: 'Uniforme', icon: 'fa-shirt', desc: 'Camisa, calça, jaleco' },
];

const TAMANHOS_NUM_SUGERIDOS = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const TAMANHOS_VEST_SUGERIDOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];

const normalize = (s) => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Heurística: detecta a classificação a partir do nome/caminho da categoria.
function detectarTipoPorCategoria(texto) {
    const n = normalize(texto);
    if (/\bcalcad|botina|sapato|\bbota/.test(n)) return 'calcado_seguranca';
    if (/uniforme|vestuario|camisa|\bcalca|jaleco|macacao|camiseta/.test(n)) return 'uniforme';
    if (/\bepc\b|protecao coletiva|coletiv/.test(n)) return 'epc';
    if (/\bepi\b|protecao individual|oculos|capacete|\bluva|protetor|mascara|respirador|abafador|protetor auricular/.test(n)) return 'epi';
    return null;
}

export default function ProdutoForm({ produto, categorias, fornecedores }) {
    const isEdit = !!produto?.id;
    const isLeroy = produto?.origem === 'leroy_merlin';

    const { data, setData, post, processing, errors } = useForm({
        categoria_id: produto?.categoria_id ?? '',
        tipo_item: produto?.tipo_item ?? 'material',
        fornecedor_padrao_id: produto?.fornecedor_padrao_id ?? '',
        sku: produto?.sku ?? '',
        codigo_barras: produto?.codigo_barras ?? '',
        nome: produto?.nome ?? '',
        marca: produto?.marca ?? '',
        descricao: produto?.descricao ?? '',
        unidade: produto?.unidade ?? 'UN',
        peso_kg: produto?.peso_kg ?? '',
        valor_unitario: produto?.valor_unitario ?? '',
        estoque_minimo: produto?.estoque_minimo ?? '',
        estoque_maximo: produto?.estoque_maximo ?? '',
        imagem: null,
        ativo: produto?.ativo ?? true,
        cores: produto?.cores ?? [],
        tamanhos_numericos: produto?.tamanhos_numericos ?? [],
        tamanhos_vestuario: produto?.tamanhos_vestuario ?? [],
        _method: isEdit ? 'put' : 'post',
    });

    const controlaVariacao = data.tipo_item !== 'material';
    const precoReferencia = isLeroy || controlaVariacao;

    const [previewImg, setPreviewImg] = useState(produto?.imagem ? `/storage/${produto.imagem}` : null);
    const [autoAviso, setAutoAviso] = useState(null); // feedback do auto-ajuste

    /* ---------- Categorias: opções com caminho hierárquico ---------- */
    const catById = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c])), [categorias]);
    const caminhoCategoria = (c) => {
        const parts = []; let cur = c, guard = 0;
        while (cur && guard++ < 20) { parts.unshift(cur.nome); cur = cur.parent_id ? catById[cur.parent_id] : null; }
        return parts.join(' › ');
    };
    const opcoesCategoria = useMemo(
        () => categorias.map((c) => ({ value: c.id, label: caminhoCategoria(c) }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        [categorias]
    );
    const opcoesUnidade = UNIDADES.map((u) => ({ value: u, label: u }));
    const opcoesFornecedor = fornecedores.map((f) => ({
        value: f.id, label: f.razao_social,
        sub: f.nome_fantasia && f.nome_fantasia !== f.razao_social ? f.nome_fantasia : '',
    }));

    /* ---------- Handlers ---------- */
    const onCategoriaChange = (catId) => {
        setData('categoria_id', catId);
        // Auto-detecta classificação SE ainda estiver no padrão "material"
        if (data.tipo_item === 'material' && catId) {
            const cat = catById[catId];
            const detectado = cat ? detectarTipoPorCategoria(caminhoCategoria(cat)) : null;
            if (detectado) {
                setData('tipo_item', detectado);
                const lbl = TIPOS_ITEM.find((t) => t.value === detectado)?.label;
                setAutoAviso(`Classificação ajustada automaticamente para “${lbl}” com base na categoria. Você pode alterar abaixo.`);
            }
        }
    };

    const onImagemChange = (e) => {
        const file = e.target.files?.[0];
        if (file) { setData('imagem', file); setPreviewImg(URL.createObjectURL(file)); }
    };

    const submit = (e) => {
        e.preventDefault();
        const url = isEdit
            ? route('admin.estoque.produtos.update', produto.id)
            : route('admin.estoque.produtos.store');
        post(url, { forceFormData: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? `Editar: ${produto.nome}` : 'Novo produto'} />
            <div className="p-6 w-full">
                <header className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-bold">{isEdit ? 'Editar produto' : 'Novo produto'}</h1>
                        <p className="text-sm text-gray-500">
                            {isEdit ? `SKU: ${produto.sku}` : 'Cadastro de produto no catálogo global.'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.estoque.produtos.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            ← Voltar
                        </Link>
                        <button type="submit" form="produto-form" disabled={processing}
                            className="px-6 py-2 bg-rise-600 text-white rounded-lg hover:bg-rise-700 text-sm disabled:opacity-50">
                            {processing ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Criar produto')}
                        </button>
                    </div>
                </header>

                <form id="produto-form" onSubmit={submit} className="space-y-4">
                    {/* CLASSIFICAÇÃO — linha cheia no topo */}
                    <Card title="Classificação do item"
                        subtitle="Define se o item controla cor/tamanho e lote (CA/validade na entrada).">
                        <div className="flex flex-wrap gap-2">
                            {TIPOS_ITEM.map((t) => {
                                const ativo = data.tipo_item === t.value;
                                return (
                                    <button key={t.value} type="button" title={t.desc}
                                        onClick={() => { setData('tipo_item', t.value); setAutoAviso(null); }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm transition ${ativo ? 'border-rise-500 bg-rise-50 text-rise-700 font-semibold'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}>
                                        <i className={`fa-solid ${t.icon}`} />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                        {autoAviso && (
                            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                <i className="fa-solid fa-wand-magic-sparkles mr-1" />{autoAviso}
                            </p>
                        )}
                        {errors.tipo_item && <p className="text-xs text-red-600 mt-1">{errors.tipo_item}</p>}
                    </Card>

                    {/* LINHA PRINCIPAL — 3 colunas que ocupam 100% da largura */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* COLUNA 1 — Imagem (maior) + status */}
                        <div className="lg:col-span-3">
                            <Card title="Imagem do produto">
                                <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-3">
                                    {previewImg ? (
                                        <img src={previewImg} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <i className="fa-solid fa-camera text-4xl mb-2 block" />
                                            <p className="text-sm">Sem imagem</p>
                                        </div>
                                    )}
                                </div>
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImagemChange}
                                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-rise-600 file:text-white hover:file:bg-rise-700" />
                                <p className="text-[11px] text-gray-400 mt-1">JPG, PNG ou WEBP até 5MB.</p>
                                {errors.imagem && <p className="text-xs text-red-600 mt-1">{errors.imagem}</p>}

                                <label className="flex items-center gap-2 cursor-pointer mt-3 pt-3 border-t">
                                    <input type="checkbox" checked={data.ativo}
                                        onChange={(e) => setData('ativo', e.target.checked)}
                                        className="h-4 w-4 text-rise-600 rounded" />
                                    <span className="text-sm text-gray-700">Produto ativo</span>
                                </label>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Inativos não aparecem para movimentação, mas mantêm histórico.
                                </p>
                            </Card>
                        </div>

                        {/* COLUNA 2 — Identificação (expande quando não há variações) */}
                        <div className={controlaVariacao ? 'lg:col-span-6' : 'lg:col-span-9'}>
                            <Card title="Identificação">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field label="SKU" hint="Em branco = gera automaticamente" error={errors.sku}>
                                        <input type="text" value={data.sku} onChange={(e) => setData('sku', e.target.value)}
                                            placeholder="SGA-XXXXXXXX"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono" />
                                    </Field>
                                    <Field label="Código de barras / EAN" error={errors.codigo_barras}>
                                        <input type="text" value={data.codigo_barras} onChange={(e) => setData('codigo_barras', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono" />
                                    </Field>
                                </div>

                                <Field label="Nome *" error={errors.nome} className="mt-3">
                                    <input type="text" value={data.nome} onChange={(e) => setData('nome', e.target.value)}
                                        required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </Field>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                    <Field label="Marca" error={errors.marca}>
                                        <input type="text" value={data.marca} onChange={(e) => setData('marca', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                    </Field>
                                    <Field label="Categoria" hint="Busque pela árvore (ex.: EPI › Óculos)" error={errors.categoria_id}>
                                        <SearchSelect options={opcoesCategoria} value={data.categoria_id}
                                            onChange={onCategoriaChange} placeholder="— Sem categoria —" />
                                    </Field>
                                </div>

                                <Field label="Descrição" error={errors.descricao} className="mt-3">
                                    <textarea value={data.descricao} onChange={(e) => setData('descricao', e.target.value)}
                                        rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </Field>
                            </Card>


                            {/* MEDIDAS E VALORES — responsivo: campos curtos numa grade,
                                fornecedor em linha própria (precisa de mais largura) */}
                            <Card title="Medidas e valores">
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                                    <Field label="Unidade *" error={errors.unidade}>
                                        <SearchSelect options={opcoesUnidade} value={data.unidade}
                                            onChange={(v) => setData('unidade', v)} allowClear={false} placeholder="UN" />
                                    </Field>
                                    <Field label="Peso (kg)" error={errors.peso_kg}>
                                        <input type="number" step="0.001" min="0" value={data.peso_kg}
                                            onChange={(e) => setData('peso_kg', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                    </Field>
                                    <Field
                                        label={precoReferencia ? 'Valor de ref. (R$)' : 'Valor unit. (R$)'}
                                        hint={
                                            isLeroy ? 'Referência Leroy'
                                                : controlaVariacao ? 'Vem na entrada (lote)'
                                                    : undefined
                                        }
                                        error={errors.valor_unitario}
                                    >
                                        <div className="relative">
                                            <input type="number" step="0.01" min="0" value={data.valor_unitario}
                                                onChange={(e) => !precoReferencia && setData('valor_unitario', e.target.value)}
                                                readOnly={precoReferencia} disabled={precoReferencia}
                                                className={`w-full border rounded-md px-3 py-2 text-sm ${precoReferencia ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed pr-9' : 'border-gray-300'
                                                    }`} />
                                            {precoReferencia && (
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                                                    <i className="fa-solid fa-lock text-xs" />
                                                </span>
                                            )}
                                        </div>
                                    </Field>
                                    <Field label="Estoque mín." hint="Alerta de saldo baixo" error={errors.estoque_minimo}>
                                        <input type="number" step="0.001" min="0" value={data.estoque_minimo}
                                            onChange={(e) => setData('estoque_minimo', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                    </Field>
                                    <Field label="Estoque máx." error={errors.estoque_maximo}>
                                        <input type="number" step="0.001" min="0" value={data.estoque_maximo}
                                            onChange={(e) => setData('estoque_maximo', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                    </Field>
                                </div>

                                {/* Fornecedor em linha própria — largura total para o select buscável */}
                                <Field label="Fornecedor padrão" hint="Sugestão padrão ao registrar entrada de estoque"
                                       error={errors.fornecedor_padrao_id} className="mt-3">
                                    <SearchSelect options={opcoesFornecedor} value={data.fornecedor_padrao_id}
                                        onChange={(v) => setData('fornecedor_padrao_id', v)} placeholder="— Selecionar fornecedor —" />
                                </Field>
                            </Card>

                        </div>

                        {/* COLUNA 3 — Variações (só EPI/calçado/EPC/uniforme); chips empilhados */}
                        {controlaVariacao && (
                            <div className="lg:col-span-3">
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-md p-4 space-y-4">
                                    <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                        🦺 Variações do item
                                    </h3>
                                    <p className="text-xs text-amber-700 -mt-2">
                                        Saldo, lote, CA e validade são por combinação (definidos na entrada).
                                    </p>
                                    <ChipManager label="Cores" placeholder="Ex.: Marrom"
                                        values={data.cores} onChange={(v) => setData('cores', v)} />
                                    <ChipManager label="Tamanhos numéricos (calçados)" placeholder="Ex.: 42"
                                        values={data.tamanhos_numericos} onChange={(v) => setData('tamanhos_numericos', v)}
                                        sugestoes={TAMANHOS_NUM_SUGERIDOS} />
                                    <ChipManager label="Tamanhos de vestuário" placeholder="Ex.: GG"
                                        values={data.tamanhos_vestuario} onChange={(v) => setData('tamanhos_vestuario', v)}
                                        sugestoes={TAMANHOS_VEST_SUGERIDOS} />
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="flex justify-end gap-2 pt-1">
                        <Link href={route('admin.estoque.produtos.index')}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={processing}
                            className="px-6 py-2 bg-rise-600 text-white rounded-md hover:bg-rise-700 text-sm disabled:opacity-50">
                            {processing ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Criar produto')}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

/* ============ Helpers ============ */
function Card({ title, subtitle, children }) {
    return (
        <div className="bg-white rounded-md border p-4">
            {title && (
                <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );
}

function Field({ label, hint, error, className = '', children }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            {children}
            {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}

function ChipManager({ label, placeholder, values, onChange, sugestoes = [] }) {
    const [input, setInput] = useState('');
    const add = (raw) => {
        const v = String(raw ?? '').trim();
        if (!v) return;
        if (values.some((x) => x.toLowerCase() === v.toLowerCase())) { setInput(''); return; }
        onChange([...values, v]); setInput('');
    };
    const remove = (v) => onChange(values.filter((x) => x !== v));
    const disponiveis = sugestoes.filter((s) => !values.some((x) => x.toLowerCase() === s.toLowerCase()));

    return (
        <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">{label}</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[1.5rem]">
                {values.length === 0 && <span className="text-[11px] text-amber-600 italic">Nenhum cadastrado.</span>}
                {values.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-900 text-xs font-medium px-2 py-1 rounded-full">
                        {v}
                        <button type="button" onClick={() => remove(v)} className="text-amber-400 hover:text-red-600 leading-none">×</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
                    placeholder={placeholder}
                    className="flex-1 border border-amber-300 rounded px-3 py-1.5 text-sm bg-white" />
                <button type="button" onClick={() => add(input)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-semibold">+</button>
            </div>
            {disponiveis.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {disponiveis.map((s) => (
                        <button key={s} type="button" onClick={() => add(s)}
                            className="text-[11px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded">+ {s}</button>
                    ))}
                </div>
            )}
        </div>
    );
}
