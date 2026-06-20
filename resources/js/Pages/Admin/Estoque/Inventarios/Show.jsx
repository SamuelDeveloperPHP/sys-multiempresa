// resources/js/Pages/Admin/Estoque/Inventarios/Show.jsx
// -----------------------------------------------------------------------------
// Tela de contagem do inventário. Linha por linha permite informar
// saldo_contado e salvar automaticamente. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_COR = {
    ABERTO:    { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    label: 'Em contagem',   icon: 'fa-clipboard-check' },
    FECHADO:   { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', label: 'Fechado',        icon: 'fa-check-circle' },
    CANCELADO: { bg: 'bg-gray-100',   border: 'border-gray-300',    text: 'text-gray-600',    label: 'Cancelado',      icon: 'fa-ban' },
};

export default function InventarioShow({ inventario: inv, itens, resumo }) {
    const { flash } = usePage().props;
    const sc = STATUS_COR[inv.status];
    const isAberto = inv.status === 'ABERTO';

    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const [modalFechar, setModalFechar] = useState(false);

    const cancelar = () => {
        if (!confirm('Cancelar inventário? Nenhuma alteração de saldo será feita.')) return;
        router.post(route('admin.estoque.inventarios.cancelar', inv.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Inventário ${inv.numero}`} />
            <div className="p-6 w-full max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Inventário {inv.numero}</h1>
                        <p className="text-sm text-gray-500">
                            Obra <strong>{inv.obra?.codigo_obra}</strong> · {inv.obra?.nome_fantasia} ·
                            Responsável: {inv.responsavel?.name}
                        </p>
                    </div>
                    <Link href={route('admin.estoque.inventarios.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                </header>

                {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

                {/* HERO de status + resumo */}
                <div className={`${sc.bg} ${sc.border} border-2 rounded-lg p-5 mb-6 flex items-center gap-4`}>
                    <div className={`w-14 h-14 rounded-full ${sc.text} bg-white shadow flex items-center justify-center`}>
                        <i className={`fa-solid ${sc.icon} text-2xl`} />
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat label="Status" value={sc.label} cor={sc.text} />
                        <Stat label="Itens contados" value={`${resumo.contados} / ${resumo.total_itens}`} />
                        <Stat label="Divergentes" value={resumo.divergentes} cor={resumo.divergentes > 0 ? 'text-amber-600' : 'text-gray-700'} />
                        <Stat label="Diferença R$" value={moeda(resumo.valor_diferenca)}
                            cor={resumo.valor_diferenca < 0 ? 'text-red-600' : resumo.valor_diferenca > 0 ? 'text-emerald-600' : 'text-gray-700'} />
                    </div>
                    {isAberto && (
                        <div className="flex flex-col gap-2 shrink-0">
                            <button type="button" onClick={() => setModalFechar(true)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-semibold">
                                <i className="fa-solid fa-check mr-1" /> Fechar inventário
                            </button>
                            <button type="button" onClick={cancelar}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">
                                <i className="fa-solid fa-ban mr-1" /> Cancelar
                            </button>
                        </div>
                    )}
                </div>

                {inv.observacao && (
                    <div className="bg-white border rounded p-4 mb-4 text-sm">
                        <p className="text-xs text-gray-500 mb-1">Observação:</p>
                        <p className="text-gray-800 whitespace-pre-wrap">{inv.observacao}</p>
                    </div>
                )}

                {/* ITENS */}
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-700">
                            Itens do inventário ({itens.total ?? itens.data.length})
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {isAberto
                                ? 'Preencha o saldo contado em cada linha e clique no ícone para salvar. Não contados ficam no topo.'
                                : 'Inventário não está mais aberto. Apenas leitura.'}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-left text-gray-700">
                                <tr>
                                    <th className="px-4 py-2 w-12"></th>
                                    <th className="px-4 py-2">Produto</th>
                                    <th className="px-4 py-2 text-right">Sistema</th>
                                    <th className="px-4 py-2 text-right w-32">Contado</th>
                                    <th className="px-4 py-2 text-right">Diferença</th>
                                    <th className="px-4 py-2 text-right">Valor diff</th>
                                    {isAberto && <th className="px-4 py-2 text-center w-16">Salvar</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {itens.data.map((it) => (
                                    <ItemRow key={it.id} item={it} inv={inv} isAberto={isAberto} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {(itens.prev_page_url || itens.next_page_url) && (
                        <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                                {itens.from}–{itens.to} de {itens.total}
                            </span>
                            <div className="flex gap-2">
                                <a href={itens.prev_page_url || '#'}
                                    className={`px-3 py-1.5 rounded border text-xs ${itens.prev_page_url ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-300 pointer-events-none'}`}>← Anterior</a>
                                <a href={itens.next_page_url || '#'}
                                    className={`px-3 py-1.5 rounded border text-xs ${itens.next_page_url ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-300 pointer-events-none'}`}>Próximo →</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {modalFechar && <ModalFechar inv={inv} resumo={resumo} onClose={() => setModalFechar(false)} />}
        </AuthenticatedLayout>
    );
}

// =============================================================================
// LINHA DE ITEM com edição inline
// =============================================================================
function ItemRow({ item, inv, isAberto }) {
    const [contado, setContado] = useState(item.saldo_contado ?? '');
    const [obs, setObs]         = useState(item.observacao ?? '');
    const [saving, setSaving]   = useState(false);
    const [dirty, setDirty]     = useState(false);

    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    const moeda  = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const onChange = (v) => { setContado(v); setDirty(true); };

    const salvar = () => {
        if (contado === '' || contado === null) {
            alert('Informe o saldo contado.');
            return;
        }
        setSaving(true);
        router.put(
            route('admin.estoque.inventarios.itens.update', [inv.id, item.id]),
            { saldo_contado: Number(contado), observacao: obs },
            { preserveScroll: true, onFinish: () => { setSaving(false); setDirty(false); } }
        );
    };

    const diferenca = contado !== '' ? (Number(contado) - Number(item.saldo_sistema)) : null;
    const corDiff = diferenca === null ? 'text-gray-400'
        : diferenca > 0 ? 'text-emerald-600' : diferenca < 0 ? 'text-red-600' : 'text-gray-700';

    const ehAbaixoMinimo = Number(item.saldo_sistema) < Number(item.produto?.estoque_minimo ?? 0);

    return (
        <tr className={`hover:bg-gray-50 ${item.contado ? '' : 'bg-amber-50/40'}`}>
            <td className="px-4 py-2">
                {item.contado ? (
                    <i className="fa-solid fa-check-circle text-emerald-500" title="Contado" />
                ) : (
                    <i className="fa-solid fa-circle-dot text-amber-500" title="Não contado" />
                )}
            </td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                    {item.produto?.imagem ? (
                        <img src={`/storage/${item.produto.imagem}`} alt="" className="w-8 h-8 rounded object-cover border" />
                    ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            <i className="fa-solid fa-box" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate max-w-[260px]">{item.produto?.nome}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.produto?.sku} · {item.produto?.unidade}</div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-2 text-right whitespace-nowrap">
                <span className={ehAbaixoMinimo ? 'text-red-600 font-semibold' : ''}>{numero(item.saldo_sistema)}</span>
                {ehAbaixoMinimo && <i className="fa-solid fa-triangle-exclamation text-red-500 ml-1" title="Abaixo do mínimo" />}
            </td>
            <td className="px-4 py-2 text-right">
                {isAberto ? (
                    <input
                        type="number" step="0.001" min="0"
                        value={contado}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') salvar(); }}
                        className={`w-24 border rounded px-2 py-1 text-sm text-right ${dirty ? 'border-amber-500 ring-1 ring-amber-200' : 'border-gray-300'}`}
                    />
                ) : (
                    <span>{item.saldo_contado !== null ? numero(item.saldo_contado) : '—'}</span>
                )}
            </td>
            <td className={`px-4 py-2 text-right whitespace-nowrap font-medium ${corDiff}`}>
                {diferenca === null ? '—' : (diferenca > 0 ? '+' : '') + numero(diferenca)}
            </td>
            <td className={`px-4 py-2 text-right whitespace-nowrap ${corDiff}`}>
                {diferenca === null || diferenca === 0 ? '—' : moeda(diferenca * Number(item.valor_unitario))}
            </td>
            {isAberto && (
                <td className="px-4 py-2 text-center">
                    <button
                        type="button" onClick={salvar} disabled={saving || !dirty}
                        title={dirty ? 'Salvar' : 'Sem alterações'}
                        className={`w-8 h-8 rounded flex items-center justify-center ${
                            dirty
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        } ${saving ? 'opacity-50' : ''}`}
                    >
                        <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
                    </button>
                </td>
            )}
        </tr>
    );
}

// =============================================================================
// MODAL: confirmar fechamento
// =============================================================================
function ModalFechar({ inv, resumo, onClose }) {
    const naoContados = (resumo.total_itens - resumo.contados);
    const [forcar, setForcar] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = () => {
        if (naoContados > 0 && !forcar) {
            alert(`Existem ${naoContados} itens não contados. Marque a caixa para forçar fechamento (eles serão tratados como saldo zero).`);
            return;
        }
        setSubmitting(true);
        router.post(route('admin.estoque.inventarios.fechar', inv.id),
            { forcar_nao_contados: forcar },
            { onFinish: () => setSubmitting(false), onSuccess: onClose }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-emerald-700">Fechar inventário {inv.numero}</h2>
                </div>
                <div className="px-6 py-5 space-y-3 text-sm">
                    <p>O sistema gerará movimentações automáticas:</p>
                    <ul className="list-disc list-inside text-xs text-gray-600 leading-relaxed">
                        <li>Itens com <strong>sobra</strong> (contado &gt; sistema) → movimentação ENTRADA</li>
                        <li>Itens com <strong>falta</strong> (contado &lt; sistema) → movimentação SAÍDA</li>
                        <li>Itens iguais (sem diferença) → nenhuma movimentação</li>
                    </ul>

                    <div className="bg-gray-50 rounded p-3 text-xs">
                        <p>Resumo:</p>
                        <ul className="mt-1 space-y-0.5">
                            <li>· Itens contados: <strong>{resumo.contados}</strong> de {resumo.total_itens}</li>
                            <li>· Itens não contados: <strong className={naoContados > 0 ? 'text-amber-700' : ''}>{naoContados}</strong></li>
                            <li>· Divergentes: <strong>{resumo.divergentes}</strong></li>
                        </ul>
                    </div>

                    {naoContados > 0 && (
                        <label className="flex items-start gap-2 cursor-pointer bg-amber-50 border border-amber-200 rounded p-3">
                            <input
                                type="checkbox" checked={forcar}
                                onChange={(e) => setForcar(e.target.checked)}
                                className="mt-1 h-4 w-4 text-amber-600"
                            />
                            <div className="text-xs">
                                <p className="font-semibold text-amber-900">
                                    Tratar não contados como saldo zero
                                </p>
                                <p className="text-amber-800 mt-0.5">
                                    Se marcado, os {naoContados} itens não contados terão saldo_contado=0 —
                                    gerando SAÍDA igual ao saldo do sistema.
                                </p>
                            </div>
                        </label>
                    )}
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                    <button onClick={submit} disabled={submitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                        {submitting ? 'Fechando…' : 'Confirmar fechamento'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, cor = 'text-gray-900' }) {
    return (
        <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-base font-bold ${cor}`}>{value}</p>
        </div>
    );
}
