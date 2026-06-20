import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const moeda = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const numf = (v) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
};

const CLASSE = {
    MOD: { label: 'Mão de obra', cls: 'bg-blue-100 text-blue-700' },
    MAT: { label: 'Material', cls: 'bg-amber-100 text-amber-700' },
    EQP: { label: 'Equipamento', cls: 'bg-purple-100 text-purple-700' },
    EQH: { label: 'Equip. (hora)', cls: 'bg-purple-100 text-purple-700' },
    SER: { label: 'Sub-composição', cls: 'bg-emerald-100 text-emerald-700' },
    SUB: { label: 'Sub-composição', cls: 'bg-emerald-100 text-emerald-700' },
};

// Badge tolerante: usa o mapa; senão agrupa por prefixo (MO*=mão de obra, EQ*=equipamento).
function badgeClasse(c) {
    if (CLASSE[c]) return CLASSE[c];
    const u = (c || '').toUpperCase();
    if (u.startsWith('MO')) return { label: 'Mão de obra', cls: 'bg-blue-100 text-blue-700' };
    if (u.startsWith('EQ')) return { label: 'Equipamento', cls: 'bg-purple-100 text-purple-700' };
    return { label: c || '—', cls: 'bg-gray-100 text-gray-600' };
}

function Linha({ label, valor, mono = false, bold = false }) {
    return (
        <div className="flex items-baseline justify-between py-1 gap-3">
            <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
            <span className={`text-sm text-gray-900 text-right ${bold ? 'font-bold' : ''} ${mono ? 'font-mono text-xs' : ''}`}>{valor ?? '—'}</span>
        </div>
    );
}

function Memorial({ titulo, texto }) {
    if (!texto) return null;
    return (
        <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">{titulo}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{texto}</p>
        </div>
    );
}

export default function ComposicaoShow({ composicao: c }) {
    const itens = c.itens || [];

    return (
        <AuthenticatedLayout>
            <Head title={`${c.codigo_alt || c.codigo} — TCPO`} />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-start justify-between mb-6 gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm px-2 py-0.5 rounded bg-[#557bbb]/10 text-[#3a5a8c]">{c.codigo_alt || c.codigo}</span>
                            {c.tipo && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.tipo}</span>}
                            {c.unidade && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">un: {c.unidade}</span>}
                        </div>
                        <h1 className="text-xl font-bold leading-snug">{c.descricao}</h1>
                    </div>
                    <Link href={route('admin.tcpo.composicoes.index')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex-shrink-0">
                        ← Voltar
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SIDEBAR: dados + totais */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados</h3>
                            <Linha label="Código PINI" valor={c.codigo} mono />
                            <Linha label="Código EAP" valor={c.codigo_alt} mono />
                            <Linha label="Base" valor={c.base} />
                            <Linha label="Categoria" valor={c.categoria?.nome} />
                            <Linha label="Unidade" valor={c.unidade} />
                            <Linha label="Região de preços" valor={c.preco_regiao} />
                            <Linha label="Data de preços" valor={c.preco_data} />
                        </div>

                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Totais (R$)</h3>
                            <Linha label="Mão de obra" valor={moeda(c.total_mod)} />
                            <Linha label="Material" valor={moeda(c.total_mat)} />
                            {c.total_eqp != null && <Linha label="Equipamento" valor={moeda(c.total_eqp)} />}
                            <div className="border-t my-2" />
                            <Linha label="Total sem taxas" valor={moeda(c.total_sem_taxas)} bold />
                            <Linha label="Total com taxas" valor={moeda(c.total_com_taxas)} bold />
                        </div>
                    </div>

                    {/* MAIN: tabela de insumos */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow border overflow-hidden">
                            <div className="px-4 py-3 border-b bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-700">Composição — insumos ({itens.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-left text-gray-700">
                                        <tr>
                                            <th className="px-3 py-2">Código</th>
                                            <th className="px-3 py-2">Descrição</th>
                                            <th className="px-3 py-2 w-28">Classe</th>
                                            <th className="px-3 py-2 w-12 text-center">Un</th>
                                            <th className="px-3 py-2 w-20 text-right">Coef.</th>
                                            <th className="px-3 py-2 w-24 text-right">Preço unit.</th>
                                            <th className="px-3 py-2 w-24 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {itens.map((it) => {
                                            const k = badgeClasse(it.classe);
                                            return (
                                                <tr key={it.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500 whitespace-nowrap">{it.codigo}</td>
                                                    <td className="px-3 py-2 text-gray-900">{it.descricao}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${k.cls}`}>{k.label}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">{it.unidade || '—'}</td>
                                                    <td className="px-3 py-2 text-right font-medium">{numf(it.coeficiente)}</td>
                                                    <td className="px-3 py-2 text-right">{moeda(it.preco_unitario)}</td>
                                                    <td className="px-3 py-2 text-right font-medium">{moeda(it.total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-semibold">
                                        <tr>
                                            <td colSpan={6} className="px-3 py-2 text-right text-gray-700">Total sem taxas:</td>
                                            <td className="px-3 py-2 text-right text-gray-900">{moeda(c.total_sem_taxas)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {(c.memorial_conteudo || c.memorial_criterio || c.memorial_normas) && (
                            <div className="space-y-4">
                                <Memorial titulo="Conteúdo do serviço" texto={c.memorial_conteudo} />
                                <Memorial titulo="Critério de medição" texto={c.memorial_criterio} />
                                <Memorial titulo="Normas técnicas" texto={c.memorial_normas} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
