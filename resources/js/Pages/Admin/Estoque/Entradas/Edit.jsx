import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchSelect from '@/Components/SearchSelect';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const TIPO_LABEL = {
    material: 'Material comum', epi: 'EPI', calcado_seguranca: 'Calçado de segurança',
    epc: 'EPC', uniforme: 'Uniforme',
};

export default function EntradaEdit({ entrada, obras, fornecedores }) {
    const p = entrada.produto ?? {};
    const lote = entrada.lote;
    const combo = entrada.variante
        ? [entrada.variante.cor, entrada.variante.tamanho].filter(Boolean).join(' · ')
        : null;

    const { data, setData, put, processing, errors } = useForm({
        obra_id:          entrada.obra_id ?? '',
        quantidade:       entrada.quantidade ?? '',
        valor_unitario:   entrada.valor_unitario ?? '',
        data_movimento:   entrada.data_movimento ?? '',
        observacao:       entrada.observacao ?? '',
        fornecedor_id:    entrada.fornecedor_id ?? '',
        nota_fiscal:      entrada.nota_fiscal ?? '',
        data_nota_fiscal: entrada.data_nota_fiscal ?? '',
        numero_ca:             lote?.numero_ca ?? '',
        numero_lote:           lote?.numero_lote ?? '',
        validade:              lote?.validade ?? '',
        especificacao_tecnica: lote?.especificacao_tecnica ?? '',
    });

    const opcoesObra = obras.map(o => ({ value: o.id, label: `${o.codigo_obra} — ${o.nome_fantasia}` }));
    const opcoesForn = fornecedores.map(f => ({
        value: f.id, label: f.razao_social,
        sub: f.nome_fantasia && f.nome_fantasia !== f.razao_social ? f.nome_fantasia : '',
    }));

    const subtotal = Number(data.quantidade || 0) * Number(data.valor_unitario || 0);
    const submit = (e) => { e.preventDefault(); put(route('admin.estoque.entradas.update', entrada.id)); };

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-sm';

    return (
        <AuthenticatedLayout>
            <Head title={`Editar entrada #${entrada.id}`} />
            <div className="p-6 w-full max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-bold">Editar entrada #{String(entrada.id).padStart(6, '0')}</h1>
                        <p className="text-sm text-gray-500">O saldo é recalculado automaticamente ao salvar.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={route('admin.estoque.entradas.show', entrada.id)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                        <button type="submit" form="entrada-edit" disabled={processing}
                                className="px-6 py-2 bg-rise-600 text-white rounded-lg hover:bg-rise-700 text-sm disabled:opacity-50">
                            {processing ? 'Salvando…' : 'Salvar alterações'}
                        </button>
                    </div>
                </header>

                {/* Produto (read-only) */}
                <div className="bg-white border rounded-md p-4 mb-4 flex items-center gap-3">
                    {p.imagem ? (
                        <img src={`/storage/${p.imagem}`} alt="" className="w-14 h-14 rounded object-cover border" />
                    ) : (
                        <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center text-gray-400 border"><i className="fa-solid fa-box" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{p.nome}</p>
                        <p className="text-[11px] font-mono text-gray-400">{p.sku} · {p.unidade}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{TIPO_LABEL[p.tipo_item] ?? 'Material'}</span>
                        {combo && <div className="text-[11px] text-amber-700 mt-1 font-medium">{combo}</div>}
                    </div>
                </div>

                <form id="entrada-edit" onSubmit={submit} className="space-y-4">
                    <div className="bg-white border rounded-md p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados da entrada</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Obra de destino *" error={errors.obra_id}>
                                <SearchSelect sm options={opcoesObra} value={data.obra_id}
                                              onChange={(v) => setData('obra_id', v)} placeholder="— Selecionar obra —" />
                            </Field>
                            <Field label="Data *" error={errors.data_movimento}>
                                <input type="date" required max={new Date().toISOString().slice(0, 10)}
                                       value={data.data_movimento} onChange={(e) => setData('data_movimento', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Quantidade *" error={errors.quantidade}>
                                <input type="number" step="0.001" min="0.001" required value={data.quantidade}
                                       onChange={(e) => setData('quantidade', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Valor unitário (R$)" error={errors.valor_unitario} hint="Recalcula o PMP">
                                <input type="number" step="0.01" min="0" value={data.valor_unitario}
                                       onChange={(e) => setData('valor_unitario', e.target.value)} className={inputCls} />
                            </Field>
                        </div>
                        {subtotal > 0 && (
                            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded px-3 py-2 text-sm text-emerald-800">
                                Valor total: <strong>{moeda(subtotal)}</strong>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border rounded-md p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nota fiscal e fornecedor</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field label="Fornecedor" error={errors.fornecedor_id}>
                                <SearchSelect sm options={opcoesForn} value={data.fornecedor_id}
                                              onChange={(v) => setData('fornecedor_id', v)} placeholder="— Selecionar —" />
                            </Field>
                            <Field label="Número da NF" error={errors.nota_fiscal}>
                                <input type="text" maxLength={50} value={data.nota_fiscal}
                                       onChange={(e) => setData('nota_fiscal', e.target.value)} className={`${inputCls} font-mono`} />
                            </Field>
                            <Field label="Data da NF" error={errors.data_nota_fiscal}>
                                <input type="date" value={data.data_nota_fiscal}
                                       onChange={(e) => setData('data_nota_fiscal', e.target.value)} className={inputCls} />
                            </Field>
                        </div>
                        <Field label="Observação" error={errors.observacao} className="mt-3">
                            <textarea value={data.observacao} rows={2}
                                      onChange={(e) => setData('observacao', e.target.value)} className={inputCls} />
                        </Field>
                    </div>

                    {/* Lote (EPI) — metadados editáveis; variação fixa */}
                    {lote && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-md p-4">
                            <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
                                <i className="fa-solid fa-helmet-safety" /> Lote do EPI
                                {combo && <span className="text-xs font-normal text-amber-700">· {combo}</span>}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="C.A. (Certificado de Aprovação)" amber error={errors.numero_ca}>
                                    <input type="text" maxLength={30} value={data.numero_ca}
                                           onChange={(e) => setData('numero_ca', e.target.value)} className={`${inputCls} font-mono bg-white`} />
                                </Field>
                                <Field label="Nº do lote" amber error={errors.numero_lote}>
                                    <input type="text" maxLength={60} value={data.numero_lote}
                                           onChange={(e) => setData('numero_lote', e.target.value)} className={`${inputCls} font-mono bg-white`} />
                                </Field>
                                <Field label="Validade" amber error={errors.validade}>
                                    <input type="date" value={data.validade}
                                           onChange={(e) => setData('validade', e.target.value)} className={`${inputCls} bg-white`} />
                                </Field>
                            </div>
                            <Field label="Especificação técnica" amber error={errors.especificacao_tecnica} className="mt-3">
                                <textarea value={data.especificacao_tecnica} rows={2}
                                          onChange={(e) => setData('especificacao_tecnica', e.target.value)} className={`${inputCls} bg-white`} />
                            </Field>
                            <p className="text-[11px] text-amber-600 mt-2">
                                Saldo atual do lote: <strong>{Number(lote.quantidade_atual).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</strong> de {Number(lote.quantidade_inicial).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}.
                                A variação (cor/tamanho) não é editável aqui.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <Link href={route('admin.estoque.entradas.show', entrada.id)}
                              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">Cancelar</Link>
                        <button type="submit" disabled={processing}
                                className="px-6 py-2 bg-rise-600 text-white rounded-md hover:bg-rise-700 text-sm disabled:opacity-50">
                            {processing ? 'Salvando…' : 'Salvar alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

function Field({ label, hint, error, className = '', amber = false, children }) {
    return (
        <div className={className}>
            {label && <label className={`block text-sm font-medium mb-1 ${amber ? 'text-amber-800' : 'text-gray-700'}`}>{label}</label>}
            {children}
            {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}
