// resources/js/Pages/Admin/Estoque/BiometriaFuncionarios/Index.jsx
// -----------------------------------------------------------------------------
// Tela do terminal do almoxarifado: o almoxarife seleciona um funcionário e
// pede pra ele encostar o dedo no leitor. Sistema cadastra a credencial
// WebAuthn vinculada ao funcionário-alvo (não ao almoxarife logado).
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { registerBiometricForUser, isSupported as bioSupported, friendlyError } from '@/offline/webauthn';

export default function BiometriaFuncionariosIndex({ funcionarios, busca, totalCompletos, totalParciais, totalZero }) {
    const { flash } = usePage().props;
    const [q, setQ] = useState(busca || '');
    const [working, setWorking] = useState(null); // userId em cadastro
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', userId, msg }
    const [supported] = useState(() => bioSupported());

    const filtrar = (e) => {
        e?.preventDefault?.();
        router.get(route('admin.estoque.biometria-funcionarios.index'), { q },
            { preserveState: true, preserveScroll: true });
    };

    const cadastrar = async (funcionario) => {
        if (!supported) {
            setFeedback({ type: 'error', userId: funcionario.id, msg: 'Navegador não suporta WebAuthn.' });
            return;
        }

        setFeedback(null);
        setWorking(funcionario.id);

        try {
            const resp = await registerBiometricForUser(funcionario.id);
            if (resp.success) {
                setFeedback({
                    type: 'success',
                    userId: funcionario.id,
                    msg: `Digital de ${funcionario.name} cadastrada com sucesso!`,
                });
                // Recarrega só os dados (sem mudar URL)
                router.reload({ only: ['funcionarios', 'totalCompletos', 'totalParciais', 'totalZero'] });
            } else {
                throw resp.error || new Error('Falha desconhecida.');
            }
        } catch (e) {
            setFeedback({
                type: 'error',
                userId: funcionario.id,
                msg: friendlyError(e, 'cadastro biométrico'),
            });
        } finally {
            setWorking(null);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Biometria de funcionários" />
            <div className="p-6 w-full max-w-6xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Biometria de funcionários (terminal)</h1>
                    <p className="text-sm text-gray-500">
                        Use no terminal do almoxarifado para cadastrar as digitais dos funcionários.
                        Selecione o funcionário e peça para ele encostar o dedo no leitor.
                    </p>
                </header>

                {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}

                {!supported && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 mb-4 text-sm">
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        Este navegador/dispositivo não suporta WebAuthn. Requer HTTPS (ou localhost) + leitor de digital
                        configurado no Windows Hello.
                    </div>
                )}

                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <KpiCard label="Completos (≥ 2 dedos)" total={totalCompletos} cor="emerald" icon="fa-check-circle" />
                    <KpiCard label="Parciais (1 dedo)"     total={totalParciais}  cor="amber"   icon="fa-triangle-exclamation" />
                    <KpiCard label="Sem biometria"          total={totalZero}      cor="red"     icon="fa-circle-xmark" />
                </div>

                {/* Filtro */}
                <form onSubmit={filtrar} className="bg-white rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        type="text" placeholder="Buscar funcionário por nome ou e-mail…"
                        value={q} onChange={(e) => setQ(e.target.value)}
                        className="md:col-span-3 border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <button className="px-4 py-2 bg-gray-800 text-white rounded text-sm">Buscar</button>
                </form>

                {/* Lista */}
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Funcionário</th>
                                <th className="px-4 py-2 text-center">Status</th>
                                <th className="px-4 py-2 text-center">Digitais</th>
                                <th className="px-4 py-2 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {funcionarios.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center text-gray-500 py-12">
                                        <i className="fa-solid fa-users text-3xl text-gray-300 mb-2 block" />
                                        Nenhum funcionário encontrado.
                                    </td>
                                </tr>
                            ) : funcionarios.map((u) => (
                                <FuncionarioRow
                                    key={u.id}
                                    funcionario={u}
                                    working={working === u.id}
                                    feedback={feedback?.userId === u.id ? feedback : null}
                                    onCadastrar={() => cadastrar(u)}
                                    disabled={!supported}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-900">
                    <p className="font-semibold mb-2"><i className="fa-solid fa-circle-info mr-1" /> Procedimento</p>
                    <ol className="space-y-1 list-decimal list-inside">
                        <li>Localize o funcionário na lista (ou busca acima).</li>
                        <li>Clique em <strong>"Cadastrar digital"</strong> na linha dele.</li>
                        <li>O Windows Hello vai pedir a digital — peça pro funcionário <strong>encostar o dedo no leitor</strong>.</li>
                        <li>Para a política completa (2 digitais), repita o cadastro <strong>com outro dedo</strong> do mesmo funcionário.</li>
                        <li>O status muda automaticamente para "Completo" quando ele tem ≥ 2 digitais.</li>
                    </ol>
                    <p className="mt-3">
                        <strong>Importante:</strong> as digitais são registradas no <strong>Windows Hello desta máquina</strong>.
                        O funcionário pode usar essa biometria <strong>apenas neste terminal</strong>. Para usar em outro PC,
                        precisa cadastrar lá também.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// =============================================================================
// LINHA DO FUNCIONÁRIO
// =============================================================================
function FuncionarioRow({ funcionario: u, working, feedback, onCadastrar, disabled }) {
    return (
        <tr className={`hover:bg-gray-50 ${working ? 'bg-blue-50' : ''}`}>
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-rise-100 text-rise-700 flex items-center justify-center font-bold text-sm">
                        {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{u.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-2 text-center">
                {u.total_credenciais === 0 ? (
                    <span className="text-[11px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        <i className="fa-solid fa-circle-xmark mr-1" /> Sem biometria
                    </span>
                ) : u.total_credenciais === 1 ? (
                    <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                        <i className="fa-solid fa-triangle-exclamation mr-1" /> Parcial
                    </span>
                ) : (
                    <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        <i className="fa-solid fa-check-circle mr-1" /> Completo
                    </span>
                )}
            </td>
            <td className="px-4 py-2 text-center">
                <span className="font-bold text-lg text-gray-700">{u.total_credenciais}</span>
                <span className="text-gray-400 text-xs"> / 2</span>
            </td>
            <td className="px-4 py-2 text-right">
                <div className="flex flex-col items-end gap-1">
                    <button
                        type="button"
                        onClick={onCadastrar}
                        disabled={working || disabled}
                        className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shadow-sm ${
                            working
                                ? 'bg-blue-500 text-white animate-pulse cursor-wait'
                                : u.atende_requisito
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                                    : 'bg-rise-600 hover:bg-rise-700 text-white'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {working ? (
                            <><i className="fa-solid fa-fingerprint mr-1" /> Aguardando dedo…</>
                        ) : (
                            <><i className="fa-solid fa-fingerprint mr-1" /> Cadastrar digital</>
                        )}
                    </button>

                    {feedback && (
                        <div className={`text-[11px] ${feedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'} max-w-[280px] text-right`}>
                            {feedback.type === 'success' ? '✓' : '✗'} {feedback.msg}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

function KpiCard({ label, total, cor, icon }) {
    const cores = {
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        amber:   'bg-amber-50 border-amber-200 text-amber-700',
        red:     'bg-red-50 border-red-200 text-red-700',
    };
    return (
        <div className={`border-2 rounded-lg p-4 ${cores[cor]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
                    <p className="text-3xl font-bold mt-1">{total}</p>
                </div>
                <i className={`fa-solid ${icon} text-3xl opacity-40`} />
            </div>
        </div>
    );
}
