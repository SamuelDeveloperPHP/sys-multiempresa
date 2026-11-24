import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UserForm from './UserForm';

export default function Edit({ user, companies, groupedModules, modulePermissions, sharedIdentity, auth }) {
    const [showReset, setShowReset] = useState(false);
    const [password, setPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const [resetError, setResetError] = useState('');

    const resetTwoFactor = () => {
        if (!password || resetting) return;
        setResetError('');
        setResetting(true);
        router.post(route('admin.users.two-factor.reset', user.id), { password }, {
            preserveScroll: true,
            onFinish: () => setResetting(false),
            onSuccess: () => { setPassword(''); setShowReset(false); },
            onError: errors => setResetError(errors.password || errors.error || 'Não foi possível redefinir o duplo fator.'),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Editar Usuário</h2>}
        >
            <Head title={`Editando: ${user.name}`} />

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        href={route('admin.users.index')}
                        className="text-sm text-gray-500 hover:text-[#557bbb] flex items-center gap-1 w-fit mb-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar para a Lista
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Editar: {user.name}</h1>
                    <p className="text-sm text-gray-500 mt-1">Atualize os dados e revise o escopo de segurança da conta.</p>
                </div>

                <UserForm
                    user={user}
                    companies={companies}
                    groupedModules={groupedModules}
                    modulePermissions={modulePermissions}
                    sharedIdentity={sharedIdentity}
                    isEdit={true}
                />

                <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Segurança da conta</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Duplo fator: <strong className={user.google2fa_enabled ? 'text-emerald-700' : 'text-gray-600'}>{user.google2fa_enabled ? 'ativado' : 'desativado'}</strong>
                            </p>
                        </div>
                        {user.google2fa_enabled && auth.user.id !== user.id && (
                            <button type="button" onClick={() => setShowReset(true)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                                Redefinir duplo fator
                            </button>
                        )}
                    </div>

                    {showReset && (
                        <div className="mt-5 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm text-amber-900">Isso removerá o autenticador e encerrará todas as sessões desse usuário. Confirme com a sua senha.</p>
                            <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" className="mt-3 w-full rounded-md border-amber-300" placeholder="Sua senha atual" />
                            {resetError && <p className="mt-2 text-sm text-red-700">{resetError}</p>}
                            <div className="mt-3 flex gap-3">
                                <button type="button" disabled={!password || resetting} onClick={resetTwoFactor} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                    {resetting ? 'Redefinindo…' : 'Confirmar redefinição'}
                                </button>
                                <button type="button" onClick={() => { setShowReset(false); setPassword(''); }} className="text-sm text-gray-600 underline">Cancelar</button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
