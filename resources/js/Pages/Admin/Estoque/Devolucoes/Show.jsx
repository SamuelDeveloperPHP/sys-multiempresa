// resources/js/Pages/Admin/Estoque/Devolucoes/Show.jsx
// -----------------------------------------------------------------------------
// Detalhe + aprovação/rejeição com senha do almoxarife. Padrão Rise.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_COR = {
    PENDENTE:  { bg: 'bg-amber-50',    border: 'border-amber-300',    text: 'text-amber-700',    icon: 'fa-hourglass-half', label: 'Aguardando aprovação' },
    APROVADA:  { bg: 'bg-emerald-50',  border: 'border-emerald-300',  text: 'text-emerald-700',  icon: 'fa-check-circle',    label: 'Aprovada' },
    REJEITADA: { bg: 'bg-red-50',      border: 'border-red-300',      text: 'text-red-700',      icon: 'fa-circle-xmark',    label: 'Rejeitada' },
};

const ESTADO_LABEL = {
    NOVO: 'Novo (lacrado)',
    USADO_OK: 'Usado em bom estado',
    AVARIADO: 'Avariado/danificado',
};

export default function DevolucaoShow({ devolucao: d, podeAprovar }) {
    const { flash } = usePage().props;
    const sc = STATUS_COR[d.status];

    const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    const horaFmt = (v) => v ? new Date(v).toLocaleString('pt-BR') : '—';

    const [modalAprovar, setModalAprovar] = useState(false);
    const [modalRejeitar, setModalRejeitar] = useState(false);

    return (
        <AuthenticatedLayout>
            <Head title={`Devolução ${d.numero}`} />
            <div className="p-6 w-full max-w-5xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Devolução {d.numero}</h1>
                        <p className="text-sm text-gray-500">Criada em {horaFmt(d.data_criacao)} por {d.funcionario?.name ?? d.funcionario_obra?.nome ?? '—'}</p>
                    </div>
                    <div className="flex gap-2">
                        <a href={route('admin.estoque.comprovantes.devolucao', d.id)}
                           target="_blank" rel="noreferrer"
                           className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-semibold"
                           title="Abre comprovante HTML para impressão">
                            🖨 Imprimir comprovante
                        </a>
                        <Link href={route('admin.estoque.devolucoes.index')}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Voltar</Link>
                    </div>
                </header>

                {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

                <div className={`${sc.bg} ${sc.border} border-2 rounded-lg p-5 mb-6 flex items-center gap-4`}>
                    <div className={`w-14 h-14 rounded-full ${sc.text} bg-white shadow flex items-center justify-center`}>
                        <i className={`fa-solid ${sc.icon} text-2xl`} />
                    </div>
                    <div className="flex-1">
                        <p className={`text-lg font-bold ${sc.text}`}>{sc.label}</p>
                        {d.status === 'APROVADA' && (
                            <p className="text-xs text-gray-600">
                                Aprovada por {d.aprovador?.name} em {horaFmt(d.data_aprovacao)}.
                                Movimentação gerada: #{d.movimentacao_gerada_id}.
                            </p>
                        )}
                        {d.status === 'REJEITADA' && (
                            <p className="text-xs text-gray-600">
                                Rejeitada por {d.aprovador?.name}. Motivo: {d.motivo_rejeicao}
                            </p>
                        )}
                    </div>

                    {d.status === 'PENDENTE' && podeAprovar && (
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setModalAprovar(true)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-semibold">
                                <i className="fa-solid fa-check mr-1" /> Aprovar
                            </button>
                            <button onClick={() => setModalRejeitar(true)}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-semibold">
                                <i className="fa-solid fa-xmark mr-1" /> Rejeitar
                            </button>
                        </div>
                    )}
                    {d.status === 'PENDENTE' && !podeAprovar && (
                        <div className="bg-white text-gray-600 px-4 py-2 rounded text-xs">
                            Você não tem permissão para aprovar.
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white rounded-lg border p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Produto</h3>
                        <div className="aspect-square bg-gray-50 rounded mb-3 overflow-hidden">
                            {d.produto?.imagem ? (
                                <img src={`/storage/${d.produto.imagem}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300"><i className="fa-solid fa-box text-5xl" /></div>
                            )}
                        </div>
                        <p className="font-semibold text-gray-900">{d.produto?.nome}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">{d.produto?.sku} · {d.produto?.unidade}</p>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-lg border p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados da devolução</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <Linha label="Funcionário" valor={d.funcionario?.name} />
                                <Linha label="Obra destino" valor={d.obra?.codigo_obra + ' — ' + (d.obra?.nome_fantasia || '')} />
                                <Linha label="Quantidade" valor={`${numero(d.quantidade)} ${d.produto?.unidade}`} bold />
                                <Linha label="Valor unit." valor={moeda(d.valor_unitario)} />
                                <Linha label="Valor total" valor={moeda(d.quantidade * d.valor_unitario)} bold />
                                <Linha label="Estado material" valor={ESTADO_LABEL[d.estado_material] || d.estado_material} />
                                {d.movimentacao_saida_id && (
                                    <Linha label="Saída original (mov)" valor={`#${d.movimentacao_saida_id}`} mono />
                                )}
                            </div>
                            {d.motivo && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-gray-500 mb-1">Motivo:</p>
                                    <p className="text-sm text-gray-800">{d.motivo}</p>
                                </div>
                            )}
                            {d.observacao && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-gray-500 mb-1">Observação:</p>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{d.observacao}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {modalAprovar && <ModalAprovar dev={d} onClose={() => setModalAprovar(false)} />}
            {modalRejeitar && <ModalRejeitar dev={d} onClose={() => setModalRejeitar(false)} />}
        </AuthenticatedLayout>
    );
}

function ModalAprovar({ dev, onClose }) {
    const [obs, setObs] = useState('');
    const [senha, setSenha] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [erro, setErro] = useState(null);

    const submit = () => {
        if (!senha) { setErro('Digite sua senha.'); return; }
        setSubmitting(true); setErro(null);
        router.post(route('admin.estoque.devolucoes.aprovar', dev.id),
            { senha_aprovador: senha, observacao: obs },
            {
                onError: (errs) => setErro(errs.senha_aprovador || errs.observacao || 'Erro ao aprovar.'),
                onSuccess: onClose,
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <ModalShell title="Aprovar devolução" cor="emerald" onClose={onClose}>
            <p className="text-sm text-gray-600 mb-3">
                Você vai aprovar a devolução <strong>{dev.numero}</strong> de
                <strong> {dev.quantidade} {dev.produto?.unidade}</strong> de <strong>{dev.produto?.nome}</strong>.
                <br />
                Ao confirmar, uma movimentação tipo <strong>DEVOLUÇÃO</strong> será gerada e o saldo da obra atualizado.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">Observação (opcional)</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
                placeholder="Comentário sobre a aprovação…" />

            <label className="block text-sm font-medium text-red-700 mb-1">
                <i className="fa-solid fa-shield-halved mr-1" /> Sua senha *
            </label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password" autoFocus
                className="w-full border-2 border-red-300 rounded px-3 py-2 text-sm mb-1"
                placeholder="••••••••" />
            <p className="text-[11px] text-gray-500">Confirma sua identidade como aprovador.</p>

            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}

            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                <button onClick={submit} disabled={submitting || !senha}
                    className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    {submitting ? 'Aprovando…' : 'Confirmar aprovação'}
                </button>
            </div>
        </ModalShell>
    );
}

function ModalRejeitar({ dev, onClose }) {
    const [motivo, setMotivo] = useState('');
    const [senha, setSenha] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [erro, setErro] = useState(null);

    const submit = () => {
        if (!motivo.trim() || !senha) { setErro('Motivo e senha são obrigatórios.'); return; }
        setSubmitting(true); setErro(null);
        router.post(route('admin.estoque.devolucoes.rejeitar', dev.id),
            { motivo_rejeicao: motivo, senha_aprovador: senha },
            {
                onError: (errs) => setErro(errs.senha_aprovador || errs.motivo_rejeicao || 'Erro ao rejeitar.'),
                onSuccess: onClose,
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <ModalShell title="Rejeitar devolução" cor="red" onClose={onClose}>
            <p className="text-sm text-gray-600 mb-3">
                Você vai rejeitar <strong>{dev.numero}</strong>. Nenhuma alteração de estoque será feita.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3" />

            <label className="block text-sm font-medium text-red-700 mb-1">
                <i className="fa-solid fa-shield-halved mr-1" /> Sua senha *
            </label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                className="w-full border-2 border-red-300 rounded px-3 py-2 text-sm" />

            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}

            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                <button onClick={submit} disabled={submitting || !motivo.trim() || !senha}
                    className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {submitting ? 'Rejeitando…' : 'Confirmar rejeição'}
                </button>
            </div>
        </ModalShell>
    );
}

function ModalShell({ title, cor = 'gray', onClose, children }) {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
