import { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Field, SenhaRetiradaModal } from '../_shared/Pickers';

/**
 * Devolução RÁPIDA — fluxo Fase 2.
 *
 * Diferente da devolução normal (PENDENTE → APROVADA com aprovador), aqui:
 *   - Operador escolhe uma SAÍDA em aberto (cujo retirante é funcionário sem login)
 *   - O MESMO funcionário valida com sua senha de retirada
 *   - Devolução vai direto para APROVADA, sem workflow
 *
 * Regra essencial: SÓ o funcionário que retirou pode devolver.
 */
export default function DevolucaoRapida({ saidas_abertas }) {
    const [busca, setBusca] = useState('');
    const [saidaSel, setSaidaSel] = useState(null);

    // Filtro local — saídas já vêm limitadas a 200 do backend
    const saidasFiltradas = useMemo(() => {
        const q = busca.trim().toLowerCase();
        if (!q) return saidas_abertas;
        return saidas_abertas.filter((s) =>
            s.produto?.nome?.toLowerCase().includes(q) ||
            s.produto?.sku?.toLowerCase().includes(q) ||
            s.retirante?.nome?.toLowerCase().includes(q) ||
            s.retirante?.matricula?.toLowerCase().includes(q) ||
            s.obra?.codigo_obra?.toLowerCase().includes(q)
        );
    }, [busca, saidas_abertas]);

    return (
        <AuthenticatedLayout>
            <Head title="Devolução rápida" />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-purple-600">↩</span> Devolução rápida
                        </h1>
                        <p className="text-sm text-gray-500">
                            Escolha a saída a devolver. Só o funcionário que retirou pode devolver — ele autentica com a própria senha.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.estoque.devolucoes.index')}
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                            Devoluções normais
                        </Link>
                    </div>
                </header>

                {saidaSel ? (
                    <DevolverForm saida={saidaSel} onCancel={() => setSaidaSel(null)} />
                ) : (
                    <>
                        <input
                            type="text"
                            placeholder="Buscar por produto, SKU, retirante, matrícula ou obra…"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-sm"
                        />

                        {saidasFiltradas.length === 0 ? (
                            <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
                                <p>Nenhuma saída pendente de devolução para os filtros atuais.</p>
                                <p className="text-xs mt-1">
                                    A lista mostra apenas saídas feitas por funcionário (sem login) com saldo devolvível &gt; 0.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {saidasFiltradas.map((s) => (
                                    <button key={s.id} type="button"
                                            onClick={() => setSaidaSel(s)}
                                            className="text-left bg-white border rounded-lg p-4 hover:border-purple-400 hover:shadow-md transition">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500">
                                                {s.data_movimento ? new Date(s.data_movimento).toLocaleDateString('pt-BR') : '—'}
                                            </span>
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                                                Devolvível: {Number(s.qtd_restante).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                            </span>
                                        </div>
                                        <div className="font-semibold text-gray-800 truncate">{s.produto?.nome}</div>
                                        <div className="text-xs text-gray-500 font-mono">{s.produto?.sku}</div>
                                        <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                                            <div>🏗 {s.obra?.codigo_obra} — {s.obra?.nome_fantasia}</div>
                                            <div>👷 {s.retirante?.nome} {s.retirante?.matricula && <span className="text-gray-400">· Matr. {s.retirante.matricula}</span>}</div>
                                            <div className="text-gray-500">
                                                Retirado: {Number(s.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                {s.ja_devolvido > 0 && (
                                                    <span> · já devolvido: {Number(s.ja_devolvido).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

/* ============================================================
 * Subcomponente: formulário de devolução para uma saída específica
 * ============================================================ */
function DevolverForm({ saida, onCancel }) {
    const { data, setData, post, processing, errors } = useForm({
        movimentacao_saida_id: saida.id,
        quantidade:            saida.qtd_restante,
        estado_material:       'USADO_OK',
        motivo:                '',
        observacao:            '',
        senha_funcionario:     '',
    });

    // Senha do funcionário: cadastro/alteração inline (sem sair da tela)
    const [temSenha, setTemSenha] = useState(saida.retirante?.tem_senha !== false);
    const [senhaModal, setSenhaModal] = useState(null); // { modo } | null

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.estoque.devolucoes.rapida.store'));
    };

    const numero = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-purple-900">Devolvendo</h2>
                    <button type="button" onClick={onCancel}
                            className="text-purple-700 hover:underline text-sm">
                        ← Trocar saída
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-purple-900">
                    <KV label="Produto" value={`${saida.produto?.nome} (${saida.produto?.sku})`} />
                    <KV label="Obra"    value={`${saida.obra?.codigo_obra} — ${saida.obra?.nome_fantasia}`} />
                    <KV label="Retirante" value={`${saida.retirante?.nome} · Matr. ${saida.retirante?.matricula ?? '—'}`} />
                    <KV label="Data da saída" value={saida.data_movimento ? new Date(saida.data_movimento).toLocaleDateString('pt-BR') : '—'} />
                    <KV label="Retirado" value={`${numero(saida.quantidade)} ${saida.produto?.unidade ?? ''}`} />
                    <KV label="Já devolvido / devolvível"
                        value={`${numero(saida.ja_devolvido)} / ${numero(saida.qtd_restante)}`} />
                </div>
            </div>

            <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Quantidade a devolver *" error={errors.quantidade}>
                    <input type="number" step="0.001" min="0.001" max={saida.qtd_restante} required
                           value={data.quantidade}
                           onChange={(e) => setData('quantidade', e.target.value)}
                           className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                </Field>
                <Field label="Estado do material *" error={errors.estado_material}>
                    <select value={data.estado_material}
                            onChange={(e) => setData('estado_material', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="NOVO">Novo</option>
                        <option value="USADO_OK">Usado — OK</option>
                        <option value="AVARIADO">Avariado</option>
                    </select>
                </Field>
                <Field label="Motivo (opcional)" error={errors.motivo}>
                    <input type="text" maxLength={500} value={data.motivo}
                           onChange={(e) => setData('motivo', e.target.value)}
                           placeholder="Ex.: sobra de obra"
                           className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                </Field>

                <div className="md:col-span-3">
                    <Field label="Observação adicional" error={errors.observacao}>
                        <textarea rows={2} value={data.observacao}
                                  onChange={(e) => setData('observacao', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    </Field>
                </div>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="text-sm font-bold text-red-800 mb-2">
                    🛡 Confirmação do funcionário
                </h3>
                <p className="text-xs text-red-700 mb-3">
                    A senha deve ser digitada pelo <strong>próprio {saida.retirante?.nome}</strong>{' '}
                    (mesmo funcionário que retirou). Outro funcionário NÃO pode devolver.
                </p>

                {!temSenha ? (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-3">
                        ⚠ Este funcionário não tem senha de retirada cadastrada.{' '}
                        <button type="button"
                                onClick={() => setSenhaModal({ modo: 'cadastrar' })}
                                className="underline font-semibold hover:text-rose-900">
                            Cadastrar agora
                        </button>
                    </div>
                ) : (
                    <div className="max-w-xs">
                        <Field label={`Senha do funcionário (${saida.retirante?.nome}) *`} error={errors.senha_funcionario}>
                            <input type="password" required autoComplete="new-password"
                                   value={data.senha_funcionario}
                                   onChange={(e) => setData('senha_funcionario', e.target.value)}
                                   className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                        </Field>
                        <button type="button"
                                onClick={() => setSenhaModal({ modo: 'alterar' })}
                                className="text-[11px] text-gray-500 hover:text-gray-700 underline mt-1">
                            Alterar senha do funcionário
                        </button>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                    Cancelar
                </button>
                <button type="submit" disabled={processing || !temSenha}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-semibold disabled:opacity-50">
                    {processing ? 'Registrando…' : 'Confirmar devolução'}
                </button>
            </div>

            {/* Modal inline de cadastro/alteração de senha do funcionário */}
            {senhaModal && saida.retirante && (
                <SenhaRetiradaModal
                    funcionario={saida.retirante}
                    modo={senhaModal.modo}
                    onClose={() => setSenhaModal(null)}
                    onSuccess={() => { setTemSenha(true); setSenhaModal(null); }}
                />
            )}
        </form>
    );
}

function KV({ label, value }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wide text-purple-700 font-semibold">{label}</div>
            <div className="font-medium">{value}</div>
        </div>
    );
}
