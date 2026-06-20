// resources/js/Pages/Admin/Estoque/Requisicoes/Show.jsx
// -----------------------------------------------------------------------------
// Detalhe + ações de transição de status. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_COR = {
    RASCUNHO:  { bg: 'bg-gray-50',     border: 'border-gray-300',    text: 'text-gray-700',    icon: 'fa-pen',           label: 'Rascunho' },
    ENVIADA:   { bg: 'bg-blue-50',     border: 'border-blue-300',    text: 'text-blue-700',    icon: 'fa-paper-plane',   label: 'Aguardando aprovação' },
    APROVADA:  { bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700', icon: 'fa-check-circle',  label: 'Aprovada' },
    ATENDIDA:  { bg: 'bg-purple-50',   border: 'border-purple-300',  text: 'text-purple-700',  label: 'Atendida',         icon: 'fa-box-archive' },
    REJEITADA: { bg: 'bg-red-50',      border: 'border-red-300',     text: 'text-red-700',     label: 'Rejeitada',        icon: 'fa-circle-xmark' },
    CANCELADA: { bg: 'bg-gray-100',    border: 'border-gray-300',    text: 'text-gray-600',    label: 'Cancelada',        icon: 'fa-ban' },
};

export default function RequisicaoShow({ requisicao: r, saldos }) {
    const { auth, flash } = usePage().props;
    const userId = auth?.user?.id;
    const isSuperAdmin = auth?.user?.type === 'super_admin';
    const isOwner = userId === r.solicitante_id;

    const sc = STATUS_COR[r.status];
    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    const dataFmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const horaFmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

    // Modais
    const [modalAtender, setModalAtender] = useState(false);
    const [modalAprovar, setModalAprovar] = useState(false);
    const [modalRejeitar, setModalRejeitar] = useState(false);

    // Permissões UI (servidor valida de novo)
    const podeEditar    = r.status === 'RASCUNHO' && (isOwner || isSuperAdmin);
    const podeEnviar    = r.status === 'RASCUNHO' && (isOwner || isSuperAdmin) && r.itens.length > 0;
    const podeCancelar  = ['RASCUNHO', 'ENVIADA'].includes(r.status) && (isOwner || isSuperAdmin);
    const podeAprovar   = r.status === 'ENVIADA';
    const podeAtender   = r.status === 'APROVADA';

    const enviar = () => {
        if (!confirm('Enviar para aprovação? Depois não será mais possível editar.')) return;
        router.post(route('admin.estoque.requisicoes.enviar', r.id));
    };
    const cancelar = () => {
        if (!confirm('Cancelar esta requisição? Esta ação não pode ser desfeita.')) return;
        router.post(route('admin.estoque.requisicoes.cancelar', r.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Requisição ${r.numero}`} />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Requisição {r.numero}</h1>
                        <p className="text-sm text-gray-500">
                            Criada em {horaFmt(r.created_at)} por {r.solicitante?.name || '—'}
                        </p>
                    </div>
                    <Link
                        href={route('admin.estoque.requisicoes.index')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        ← Voltar
                    </Link>
                </header>

                {flash?.success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
                        {flash.error}
                    </div>
                )}

                {/* HERO de status */}
                <div className={`${sc.bg} ${sc.border} border-2 rounded-lg p-5 mb-6 flex items-center gap-4`}>
                    <div className={`w-14 h-14 rounded-full ${sc.text} bg-white shadow flex items-center justify-center`}>
                        <i className={`fa-solid ${sc.icon} text-2xl`} />
                    </div>
                    <div className="flex-1">
                        <p className={`text-lg font-bold ${sc.text}`}>{sc.label}</p>
                        {r.status === 'ENVIADA' && r.data_envio && (
                            <p className="text-xs text-gray-600">Enviada em {horaFmt(r.data_envio)}. Aguardando aprovador.</p>
                        )}
                        {r.status === 'APROVADA' && (
                            <p className="text-xs text-gray-600">Aprovada por {r.aprovador?.name} em {horaFmt(r.data_aprovacao)}. Pronta para atendimento.</p>
                        )}
                        {r.status === 'ATENDIDA' && (
                            <p className="text-xs text-gray-600">Atendida por {r.atendente?.name} em {horaFmt(r.data_atendimento)}. Saldos atualizados.</p>
                        )}
                        {r.status === 'REJEITADA' && (
                            <p className="text-xs text-gray-600">Rejeitada por {r.aprovador?.name}. Motivo: {r.motivo_rejeicao}</p>
                        )}
                    </div>

                    {/* AÇÕES */}
                    <div className="flex flex-col gap-2">
                        {podeEditar && (
                            <Link href={route('admin.estoque.requisicoes.edit', r.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold text-center">
                                <i className="fa-solid fa-pen-to-square mr-1" />
                                Editar
                            </Link>
                        )}
                        {podeEnviar && (
                            <button type="button" onClick={enviar}
                                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-semibold">
                                <i className="fa-solid fa-paper-plane mr-1" />
                                Enviar para aprovação
                            </button>
                        )}
                        {podeAprovar && (
                            <>
                                <button type="button" onClick={() => setModalAprovar(true)}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-semibold">
                                    <i className="fa-solid fa-check mr-1" />
                                    Aprovar
                                </button>
                                <button type="button" onClick={() => setModalRejeitar(true)}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-semibold">
                                    <i className="fa-solid fa-xmark mr-1" />
                                    Rejeitar
                                </button>
                            </>
                        )}
                        {podeAtender && (
                            <button type="button" onClick={() => setModalAtender(true)}
                                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-semibold">
                                <i className="fa-solid fa-box-archive mr-1" />
                                Atender
                            </button>
                        )}
                        {podeCancelar && (
                            <button type="button" onClick={cancelar}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">
                                <i className="fa-solid fa-ban mr-1" />
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* DADOS GERAIS */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados</h3>
                            <Linha label="Número" valor={r.numero} mono />
                            <Linha label="Data" valor={dataFmt(r.data_solicitacao)} />
                            <Linha label="Solicitante" valor={r.solicitante?.name} />
                            <Linha label="Obra origem" valor={r.obra_origem?.codigo_obra} />
                            {r.obra_destino && <Linha label="Obra destino" valor={r.obra_destino.codigo_obra} />}
                            <Linha label="Total est." valor={moeda(r.valor_total_estimado)} bold />
                        </div>

                        {r.observacao_solicitante && (
                            <div className="bg-white rounded-lg border p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Observação do solicitante</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.observacao_solicitante}</p>
                            </div>
                        )}

                        {r.observacao_aprovador && (
                            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                                <h3 className="text-sm font-semibold text-emerald-800 mb-2">
                                    <i className="fa-solid fa-check-circle mr-1" /> Observação do aprovador
                                </h3>
                                <p className="text-sm text-emerald-900 whitespace-pre-wrap">{r.observacao_aprovador}</p>
                            </div>
                        )}

                        {r.motivo_rejeicao && (
                            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                                <h3 className="text-sm font-semibold text-red-800 mb-2">
                                    <i className="fa-solid fa-circle-xmark mr-1" /> Motivo da rejeição
                                </h3>
                                <p className="text-sm text-red-900 whitespace-pre-wrap">{r.motivo_rejeicao}</p>
                            </div>
                        )}
                    </div>

                    {/* ITENS */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow border overflow-hidden">
                        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Itens ({r.itens.length})</h3>
                            <span className="text-xs text-gray-500">Saldo: obra origem</span>
                        </div>
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-left text-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Produto</th>
                                    <th className="px-4 py-2 text-right">Solicitado</th>
                                    <th className="px-4 py-2 text-right">Atendido</th>
                                    <th className="px-4 py-2 text-right">Saldo na obra</th>
                                    <th className="px-4 py-2 text-right">Valor unit.</th>
                                    <th className="px-4 py-2 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {r.itens.map((it) => {
                                    const saldo = saldos[it.produto_id] ?? 0;
                                    const insuficiente = saldo < Number(it.quantidade_solicitada);
                                    return (
                                        <tr key={it.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    {it.produto?.imagem ? (
                                                        <img src={`/storage/${it.produto.imagem}`} alt="" className="w-8 h-8 rounded object-cover border" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                            <i className="fa-solid fa-box" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">{it.produto?.nome}</div>
                                                        <div className="text-[11px] text-gray-400 font-mono">{it.produto?.sku}</div>
                                                    </div>
                                                </div>
                                                {it.observacao && (
                                                    <div className="text-[11px] text-gray-500 mt-1 pl-10">{it.observacao}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                                {numero(it.quantidade_solicitada)} {it.produto?.unidade}
                                            </td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap">
                                                {Number(it.quantidade_atendida) > 0 ? (
                                                    <span className="text-emerald-700">{numero(it.quantidade_atendida)} {it.produto?.unidade}</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap">
                                                <span className={insuficiente ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                                    {numero(saldo)}
                                                </span>
                                                {insuficiente && <i className="fa-solid fa-triangle-exclamation text-red-500 ml-1" title="Saldo insuficiente" />}
                                            </td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap">{moeda(it.valor_unitario_estimado)}</td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap font-medium">{moeda(it.valor_total_estimado)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                    <td colSpan={5} className="px-4 py-2 text-right text-gray-700">Total estimado:</td>
                                    <td className="px-4 py-2 text-right text-gray-900">{moeda(r.valor_total_estimado)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {modalAprovar && <ModalAprovar requisicao={r} onClose={() => setModalAprovar(false)} />}
            {modalRejeitar && <ModalRejeitar requisicao={r} onClose={() => setModalRejeitar(false)} />}
            {modalAtender && <ModalAtender requisicao={r} saldos={saldos} onClose={() => setModalAtender(false)} />}
        </AuthenticatedLayout>
    );
}

// =============================================================================
// MODAIS
// =============================================================================
function ModalAprovar({ requisicao, onClose }) {
    const [obs, setObs] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = () => {
        setSubmitting(true);
        router.post(route('admin.estoque.requisicoes.aprovar', requisicao.id),
            { observacao_aprovador: obs },
            { onFinish: () => setSubmitting(false), onSuccess: onClose }
        );
    };

    return (
        <ModalShell title="Aprovar requisição" cor="emerald" onClose={onClose}>
            <p className="text-sm text-gray-600 mb-3">
                Você está aprovando a requisição <strong>{requisicao.numero}</strong>. Após aprovar,
                o almoxarife pode atender (gerar movimentações de saída).
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
            <textarea
                rows={3}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
                placeholder="Comentários sobre a aprovação…"
            />
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                <button onClick={submit} disabled={submitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    {submitting ? 'Aprovando…' : 'Confirmar aprovação'}
                </button>
            </div>
        </ModalShell>
    );
}

function ModalRejeitar({ requisicao, onClose }) {
    const [motivo, setMotivo] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = () => {
        if (!motivo.trim()) {
            alert('Informe o motivo da rejeição.');
            return;
        }
        setSubmitting(true);
        router.post(route('admin.estoque.requisicoes.rejeitar', requisicao.id),
            { motivo_rejeicao: motivo },
            { onFinish: () => setSubmitting(false), onSuccess: onClose }
        );
    };

    return (
        <ModalShell title="Rejeitar requisição" cor="red" onClose={onClose}>
            <p className="text-sm text-gray-600 mb-3">
                Você está rejeitando <strong>{requisicao.numero}</strong>. O solicitante será notificado.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <textarea
                rows={3} required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
                placeholder="Explique por que está rejeitando…"
            />
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                <button onClick={submit} disabled={submitting || !motivo.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {submitting ? 'Rejeitando…' : 'Confirmar rejeição'}
                </button>
            </div>
        </ModalShell>
    );
}

function ModalAtender({ requisicao, saldos, onClose }) {
    const [atendimentos, setAtendimentos] = useState(
        requisicao.itens.map((it) => ({
            item_id: it.id,
            produto: it.produto,
            quantidade_solicitada: Number(it.quantidade_solicitada),
            quantidade_atendida: Math.min(Number(it.quantidade_solicitada), saldos[it.produto_id] ?? 0),
            saldo: saldos[it.produto_id] ?? 0,
        }))
    );
    const [submitting, setSubmitting] = useState(false);
    const [erros, setErros] = useState([]);

    const update = (idx, value) => {
        const novo = atendimentos.map((a, i) =>
            i === idx ? { ...a, quantidade_atendida: Number(value) } : a
        );
        setAtendimentos(novo);
    };

    const submit = () => {
        const erros = [];
        atendimentos.forEach((a) => {
            if (a.quantidade_atendida < 0) erros.push(`${a.produto?.nome}: quantidade negativa`);
            if (a.quantidade_atendida > a.quantidade_solicitada) erros.push(`${a.produto?.nome}: atendimento maior que solicitado`);
            if (a.quantidade_atendida > a.saldo) erros.push(`${a.produto?.nome}: saldo insuficiente (disp. ${a.saldo})`);
        });
        if (erros.length > 0) { setErros(erros); return; }

        if (!confirm('Confirmar atendimento? Movimentações de saída serão geradas para cada item com quantidade > 0.')) return;

        setSubmitting(true);
        router.post(route('admin.estoque.requisicoes.atender', requisicao.id),
            { itens: atendimentos.map((a) => ({ item_id: a.item_id, quantidade_atendida: a.quantidade_atendida })) },
            { onFinish: () => setSubmitting(false), onSuccess: onClose }
        );
    };

    return (
        <ModalShell title="Atender requisição" cor="purple" onClose={onClose} large>
            <p className="text-sm text-gray-600 mb-3">
                Confirme a quantidade que será baixada de cada item. Saldos da obra origem são mostrados.
                Cada item com quantidade {'>'} 0 gera uma movimentação de SAÍDA.
            </p>

            <div className="overflow-x-auto -mx-6">
                <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-left">
                        <tr>
                            <th className="px-4 py-2">Produto</th>
                            <th className="px-4 py-2 text-right">Solicitado</th>
                            <th className="px-4 py-2 text-right">Saldo</th>
                            <th className="px-4 py-2 text-right w-40">Atender</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {atendimentos.map((a, idx) => {
                            const insuf = a.quantidade_atendida > a.saldo;
                            const excede = a.quantidade_atendida > a.quantidade_solicitada;
                            return (
                                <tr key={a.item_id}>
                                    <td className="px-4 py-2">
                                        <div className="font-medium">{a.produto?.nome}</div>
                                        <div className="text-[11px] text-gray-400 font-mono">{a.produto?.sku}</div>
                                    </td>
                                    <td className="px-4 py-2 text-right">{a.quantidade_solicitada} {a.produto?.unidade}</td>
                                    <td className={`px-4 py-2 text-right ${a.saldo < a.quantidade_solicitada ? 'text-red-600 font-semibold' : ''}`}>
                                        {a.saldo}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <input
                                            type="number" step="0.001" min="0"
                                            max={Math.min(a.quantidade_solicitada, a.saldo)}
                                            value={a.quantidade_atendida}
                                            onChange={(e) => update(idx, e.target.value)}
                                            className={`w-full border rounded px-2 py-1 text-sm text-right ${
                                                insuf || excede ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {erros.length > 0 && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-800 rounded p-3 text-xs">
                    {erros.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                <button onClick={submit} disabled={submitting}
                    className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                    {submitting ? 'Atendendo…' : 'Confirmar atendimento'}
                </button>
            </div>
        </ModalShell>
    );
}

function ModalShell({ title, cor = 'gray', onClose, children, large = false }) {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-lg shadow-xl ${large ? 'max-w-3xl' : 'max-w-lg'} w-full max-h-[90vh] overflow-y-auto`}>
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className={`text-lg font-semibold text-${cor}-700`}>{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

function Linha({ label, valor, bold = false, mono = false }) {
    return (
        <div className="flex items-baseline justify-between py-1">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-sm text-gray-900 ${bold ? 'font-bold' : ''} ${mono ? 'font-mono' : ''}`}>{valor}</span>
        </div>
    );
}
