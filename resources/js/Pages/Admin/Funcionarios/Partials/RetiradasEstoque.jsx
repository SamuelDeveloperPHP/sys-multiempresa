import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

/**
 * Aba "Estoque / Ferramentas" do funcionário.
 *
 * Conteúdo:
 *   1. Card "Senha de Estoque" — cadastrar/alterar/remover a `senha_retirada`
 *      (porta o handleSenhaEstoque do legacy show-scripts.blade.php).
 *   2. Card legado de EPIs/Ferramentas/Uniformes.
 */
export default function RetiradasEstoque({ funcionario }) {
    const epiRetirados = funcionario.epi_retirados || [];

    return (
        <div className="animate-fade-in-up space-y-6">
            <SenhaEstoqueCard funcionario={funcionario} />

            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-6">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        EPI's, Ferramentas e Uniformes
                    </h3>
                    <a href={route('admin.funcionarios.ficha-epi', funcionario.id)} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Imprimir Ficha de EPI
                    </a>
                </div>

                <div className="p-6">
                    {epiRetirados.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Nenhum equipamento em posse</h4>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Este funcionário não possui EPIs, Ferramentas ou Uniformes vinculados em seu nome pelo almoxarifado.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-left text-gray-600">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">Data</th>
                                        <th className="px-3 py-2 font-semibold">EPI</th>
                                        <th className="px-3 py-2 font-semibold">Variação</th>
                                        <th className="px-3 py-2 font-semibold">C.A. / Lote</th>
                                        <th className="px-3 py-2 font-semibold">Validade</th>
                                        <th className="px-3 py-2 font-semibold">Obra</th>
                                        <th className="px-3 py-2 font-semibold text-right">Em posse</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {epiRetirados.map((e) => {
                                        const venc = e.validade ? Math.ceil((new Date(e.validade + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000) : null;
                                        return (
                                            <tr key={e.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap">{e.data ? new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-800">{e.produto}</div>
                                                    <div className="text-[10px] font-mono text-gray-400">{e.sku}</div>
                                                </td>
                                                <td className="px-3 py-2">{e.variacao || '—'}</td>
                                                <td className="px-3 py-2">
                                                    {e.numero_ca ? <span className="font-mono">CA {e.numero_ca}</span> : '—'}
                                                    {e.numero_lote && <div className="text-[10px] text-gray-400">{e.numero_lote}</div>}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {e.validade ? new Date(e.validade + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                                    {venc !== null && venc < 0 && <span className="ml-1 text-rose-600 font-bold">(vencido)</span>}
                                                    {venc !== null && venc >= 0 && venc <= 30 && <span className="ml-1 text-amber-600 font-bold">({venc}d)</span>}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500">{e.obra || '—'}</td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-900">
                                                    {Number(e.em_posse).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} <span className="text-[10px] text-gray-400">{e.unidade}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <p className="text-[11px] text-gray-400 mt-2">
                                Lista derivada das saídas de EPI autenticadas por este funcionário (NR-6), descontadas as devoluções.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
 * SenhaEstoqueCard — porta o handleSenhaEstoque (legacy SwAl2):
 *   - Cadastrar primeira senha: campo "senha" apenas.
 *   - Alterar senha existente: campos "senha nova" + "CPF" (do funcionário,
 *     usado como confirmação de identidade).
 *   - Remover senha (admin pode revogar).
 *
 * Backend: PUT/DELETE /admin/funcionarios/{id}/senha-retirada
 * ============================================================ */
function SenhaEstoqueCard({ funcionario }) {
    // Estado local — pode mudar dinamicamente sem reload da página.
    const [temSenha, setTemSenha] = useState(!!funcionario.tem_senha_retirada);
    const [modalAberto, setModalAberto] = useState(false);
    const [acao, setAcao] = useState('cadastrar'); // 'cadastrar' | 'alterar' | 'remover'

    const abrir = (proxAcao) => { setAcao(proxAcao); setModalAberto(true); };

    return (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-5 py-4 border-b border-amber-200 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Senha de Estoque
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {temSenha
                            ? 'Este funcionário possui senha cadastrada e pode retirar/devolver itens do estoque.'
                            : 'Cadastre uma senha simples (4–8 dígitos) para que o funcionário autorize retiradas e devoluções.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!temSenha ? (
                        <button
                            type="button"
                            onClick={() => abrir('cadastrar')}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            Cadastrar senha
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => abrir('alterar')}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Alterar
                            </button>
                            <button
                                type="button"
                                onClick={() => abrir('remover')}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-bold rounded-lg transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>
                                Remover
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <KV label="Funcionário" value={funcionario.nome} />
                <KV label="Matrícula"   value={funcionario.matricula || '—'} />
                <KV label="CPF"         value={funcionario.cpf || '—'} />
                <KV label="Status"
                    value={
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${temSenha ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {temSenha ? '🔓 Senha ativa' : '🔒 Sem senha'}
                        </span>
                    } />
                <KV label="Última retirada"
                    value={funcionario.data_ultima_retirada
                        ? new Date(funcionario.data_ultima_retirada).toLocaleString('pt-BR')
                        : '—'} />
            </div>

            {modalAberto && (
                <SenhaModal
                    funcionario={funcionario}
                    acao={acao}
                    onClose={() => setModalAberto(false)}
                    onSuccess={(novoStatus) => {
                        setTemSenha(novoStatus);
                        setModalAberto(false);
                    }}
                />
            )}
        </div>
    );
}

function KV({ label, value }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{label}</div>
            <div className="text-gray-800 font-medium">{value}</div>
        </div>
    );
}

/* ============================================================
 * Modal dedicado (sem dependência de Swal2 do legacy)
 * ============================================================ */
function SenhaModal({ funcionario, acao, onClose, onSuccess }) {
    const isUpdate = acao === 'alterar';
    const isRemove = acao === 'remover';

    const [senha, setSenha] = useState('');
    const [cpf, setCpf] = useState('');
    const [erros, setErros] = useState({});
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e?.preventDefault?.();
        setErros({});
        setLoading(true);

        try {
            if (isRemove) {
                if (!confirm(`Remover a senha de estoque de ${funcionario.nome}? Ele deixará de poder retirar materiais até ter uma nova senha.`)) {
                    setLoading(false);
                    return;
                }
                await axios.delete(route('admin.funcionarios.senha-retirada.destroy', funcionario.id));
                onSuccess(false);
                return;
            }

            await axios.put(
                route('admin.funcionarios.senha-retirada.update', funcionario.id),
                isUpdate ? { senha, cpf } : { senha }
            );

            onSuccess(true);
        } catch (err) {
            if (err.response?.status === 422) {
                setErros(err.response.data?.errors ?? {});
            } else {
                setErros({ _erro: err.response?.data?.message ?? 'Erro ao salvar.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const titulo =
        isRemove ? 'Remover senha de estoque' :
        isUpdate ? 'Alterar senha de estoque' :
                   'Cadastrar senha de estoque';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
             onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md"
                 onClick={(e) => e.stopPropagation()}>
                <header className="px-5 py-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{titulo}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </header>

                <form onSubmit={submit} className="p-5 space-y-3">
                    <div className="bg-gray-50 border rounded p-3 text-sm">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Funcionário</div>
                        <div className="font-bold text-gray-800">{funcionario.nome}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            CPF: {funcionario.cpf || '—'} · Matrícula: {funcionario.matricula || '—'}
                        </div>
                    </div>

                    {isRemove ? (
                        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-3">
                            Esta ação <strong>revoga</strong> a capacidade do funcionário de retirar materiais até
                            uma nova senha ser cadastrada. Confirma?
                        </p>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs uppercase font-semibold text-gray-600 block mb-1">
                                    {isUpdate ? 'Nova senha *' : 'Senha *'}
                                </label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required minLength={4} maxLength={32}
                                    autoComplete="new-password"
                                    placeholder="4 a 32 caracteres"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                                {erros.senha && <p className="text-xs text-rose-600 mt-1">{erros.senha[0] ?? erros.senha}</p>}
                            </div>

                            {isUpdate && (
                                <div>
                                    <label className="text-xs uppercase font-semibold text-gray-600 block mb-1">
                                        CPF do funcionário *
                                        <span className="font-normal lowercase text-gray-500 ml-1">(confirmação)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={cpf}
                                        onChange={(e) => setCpf(e.target.value)}
                                        required
                                        placeholder="000.000.000-00"
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                    {erros.cpf && <p className="text-xs text-rose-600 mt-1">{erros.cpf[0] ?? erros.cpf}</p>}
                                </div>
                            )}
                        </>
                    )}

                    {erros._erro && (
                        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">{erros._erro}</p>
                    )}

                    <footer className="flex justify-end gap-2 pt-3 border-t mt-4">
                        <button type="button" onClick={onClose}
                                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                                className={`px-4 py-2 text-white rounded text-sm font-bold disabled:opacity-50 ${
                                    isRemove ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
                                }`}>
                            {loading ? 'Salvando…' :
                             isRemove ? 'Remover'  :
                             isUpdate ? 'Atualizar senha' : 'Salvar senha'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
