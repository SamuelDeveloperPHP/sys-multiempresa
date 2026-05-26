// resources/js/Pages/Admin/Perfil/Biometria.jsx
// -----------------------------------------------------------------------------
// Gestão de credenciais biométricas (WebAuthn) do usuário logado.
// Permite cadastrar múltiplas digitais e remover. Política: ≥ 2 credenciais
// ativas para poder usar biometria nas retiradas de estoque.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { registerBiometric, isSupported as bioSupported, friendlyError } from '@/offline/webauthn';

export default function Biometria({ credenciais, totalAtivas, atendeRequisito }) {
    const { flash, auth } = usePage().props;
    const [working, setWorking] = useState(false);
    const [erro, setErro] = useState(null);
    const [sucesso, setSucesso] = useState(null);
    const [supported] = useState(() => bioSupported());

    const cadastrar = async () => {
        setErro(null); setSucesso(null);
        if (!supported) {
            setErro('Seu navegador/dispositivo não suporta WebAuthn (precisa Touch ID, Windows Hello, ou leitor de digital USB).');
            return;
        }
        setWorking(true);
        try {
            const resp = await registerBiometric();
            if (resp.success) {
                setSucesso('Nova biometria registrada com sucesso!');
                router.reload({ only: ['credenciais', 'totalAtivas', 'atendeRequisito'] });
            } else {
                throw resp.error || new Error('Falha ao registrar.');
            }
        } catch (e) {
            setErro(friendlyError(e, 'cadastro de biometria'));
        } finally {
            setWorking(false);
        }
    };

    const revogar = (cred) => {
        if (totalAtivas <= 2) {
            if (!confirm(`ATENÇÃO: você tem apenas ${totalAtivas} biometrias ativas. Removendo essa, você terá ${totalAtivas - 1}, abaixo do mínimo (2) exigido para retiradas do estoque.\n\nContinuar mesmo assim?`)) return;
        } else {
            if (!confirm('Remover esta biometria? Você não poderá mais usar essa digital para autenticar.')) return;
        }
        router.delete(route('admin.perfil.biometria.destroy', cred.id), { preserveScroll: true });
    };

    const dataFmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

    return (
        <AuthenticatedLayout>
            <Head title="Minhas biometrias" />
            <div className="p-6 w-full max-w-4xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Minhas biometrias</h1>
                    <p className="text-sm text-gray-500">
                        Cadastre suas digitais (Touch ID, Windows Hello, leitor USB) para usar biometria
                        em vez de senha nas retiradas de estoque.
                    </p>
                </header>

                {flash?.success && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{flash.success}</div>}
                {flash?.error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{flash.error}</div>}
                {erro && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{erro}</div>}
                {sucesso && <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4">{sucesso}</div>}

                {/* STATUS */}
                <div className={`rounded-lg border-2 p-5 mb-6 ${
                    atendeRequisito ? 'bg-emerald-50 border-emerald-300' :
                    totalAtivas === 1 ? 'bg-amber-50 border-amber-300' :
                    'bg-red-50 border-red-300'
                }`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-full bg-white shadow flex items-center justify-center ${
                            atendeRequisito ? 'text-emerald-600' :
                            totalAtivas === 1 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                            <i className="fa-solid fa-fingerprint text-2xl" />
                        </div>
                        <div className="flex-1">
                            <h2 className={`text-lg font-bold ${
                                atendeRequisito ? 'text-emerald-800' :
                                totalAtivas === 1 ? 'text-amber-800' : 'text-red-800'
                            }`}>
                                {atendeRequisito ? '✓ Biometria pronta para uso' :
                                 totalAtivas === 1 ? '⚠ Cadastre mais 1 biometria' :
                                 'Sem biometria cadastrada'}
                            </h2>
                            <p className="text-sm mt-1 text-gray-700">
                                Você tem <strong>{totalAtivas}</strong> biometria(s) ativa(s).
                                {atendeRequisito && ' Atende o requisito mínimo de 2 para retiradas de estoque.'}
                                {totalAtivas === 1 && ' É necessário ter ≥ 2 (redundância — se um dedo machucar, outro funciona).'}
                                {totalAtivas === 0 && ' Cadastre pelo menos 2 digitais diferentes.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={cadastrar}
                            disabled={working || !supported}
                            className={`px-4 py-2 rounded text-sm font-semibold shadow ${
                                working || !supported
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-rise-600 text-white hover:bg-rise-700'
                            }`}
                        >
                            {working ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-1" /> Aguardando…</>
                            ) : (
                                <><i className="fa-solid fa-plus mr-1" /> Cadastrar nova</>
                            )}
                        </button>
                    </div>
                </div>

                {!supported && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 mb-4 text-sm">
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        Seu navegador/dispositivo não suporta WebAuthn. Requisitos:
                        HTTPS (ou localhost), Chrome 67+/Safari 14+/Firefox 60+, e plataforma com biometria
                        (Touch ID, Face ID, Windows Hello, ou leitor USB compatível).
                    </div>
                )}

                {/* LISTA */}
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-700">Credenciais cadastradas</h3>
                    </div>
                    {credenciais.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <i className="fa-solid fa-fingerprint text-3xl text-gray-300 mb-2 block" />
                            Nenhuma biometria cadastrada.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-gray-700">
                                <tr>
                                    <th className="px-4 py-2">#</th>
                                    <th className="px-4 py-2">Dispositivo</th>
                                    <th className="px-4 py-2">Cadastrada em</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {credenciais.map((c, i) => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-mono text-gray-500">{i + 1}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <i className="fa-solid fa-fingerprint text-rise-600" />
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {c.alias || 'Biometria sem nome'}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 font-mono">
                                                        {c.origin}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{dataFmt(c.created_at)}</td>
                                        <td className="px-4 py-2">
                                            {c.disabled_at ? (
                                                <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                                                    Desativada
                                                </span>
                                            ) : (
                                                <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                                    <i className="fa-solid fa-check mr-1" /> Ativa
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => revogar(c)}
                                                className="px-2 py-1 text-red-600 hover:bg-red-100 rounded text-xs"
                                                title="Revogar biometria"
                                            >
                                                <i className="fa-solid fa-trash mr-1" /> Revogar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-900">
                    <p className="font-semibold mb-2">
                        <i className="fa-solid fa-circle-info mr-1" />
                        Por que ≥ 2 biometrias?
                    </p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li><strong>Redundância:</strong> se um dedo ficar machucado, sujo ou ferido, o outro ainda funciona.</li>
                        <li><strong>Segurança:</strong> reduz fraudes — só você consegue duplicar a autenticação.</li>
                        <li><strong>Política da empresa:</strong> retiradas de estoque exigem ao menos 2 dedos cadastrados.</li>
                    </ul>
                    <p className="mt-3">
                        <strong>Dica:</strong> cadastre <strong>polegar e indicador</strong> da mão dominante.
                        Para cadastrar, clique em <strong>"Cadastrar nova"</strong> acima — o navegador vai pedir
                        sua digital no momento.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
