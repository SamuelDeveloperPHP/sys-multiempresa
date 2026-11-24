import { Head, Link, router, useForm } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import PortalLayout from '../../Layouts/PortalLayout';

export default function TwoFactorSettings({ enabled, requiresSetup, qrCodeUrl, secret, recoveryCodes = [] }) {
    const enableForm = useForm({ code: '' });
    const disableForm = useForm({ password: '' });

    const enable = event => {
        event.preventDefault();
        enableForm.post('/portal/security/2fa/enable');
    };

    const disable = event => {
        event.preventDefault();
        disableForm.post('/portal/security/2fa/disable');
    };

    return (
        <PortalLayout>
            <Head title="Segurança da conta" />
            <div className="mx-auto max-w-2xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Duplo fator</h1>
                        <p className="mt-1 text-sm text-gray-500">Proteja o acesso ao portal com um aplicativo autenticador.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                        {enabled ? 'Ativado' : 'Desativado'}
                    </span>
                </div>

                {!enabled && !requiresSetup && (
                    <button type="button" onClick={() => router.post('/portal/security/2fa/generate')} className="rounded-lg bg-[#557bbb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4263a3]">
                        Ativar duplo fator
                    </button>
                )}

                {!enabled && requiresSetup && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                        <h2 className="font-semibold text-gray-900">Escaneie e confirme</h2>
                        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="w-fit rounded-lg bg-white p-3">{qrCodeUrl && <QRCodeSVG value={qrCodeUrl} size={160} />}</div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-600">Chave para configuração manual</p>
                                <code className="mt-1 block break-all rounded bg-white p-2 text-sm">{secret}</code>
                            </div>
                        </div>
                        <form onSubmit={enable} className="mt-5 max-w-xs">
                            <input value={enableForm.data.code} onChange={event => enableForm.setData('code', event.target.value)} inputMode="numeric" maxLength="6" required className="w-full rounded-lg border-gray-300 text-center font-mono text-xl tracking-widest" placeholder="000000" />
                            {enableForm.errors.code && <p className="mt-1 text-sm text-red-600">{enableForm.errors.code}</p>}
                            <div className="mt-3 flex gap-3">
                                <button disabled={enableForm.processing} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Validar e ativar</button>
                                <button type="button" onClick={() => router.post('/portal/security/2fa/disable')} className="text-sm text-gray-600 underline">Cancelar</button>
                            </div>
                        </form>
                    </div>
                )}

                {enabled && (
                    <div className="space-y-5">
                        {recoveryCodes.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <p className="font-semibold text-amber-900">Guarde os códigos de recuperação</p>
                                <p className="mt-1 text-xs text-amber-800">Cada código funciona apenas uma vez e não será exibido novamente.</p>
                                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">{recoveryCodes.map(code => <code key={code}>{code}</code>)}</div>
                            </div>
                        )}
                        <form onSubmit={disable} className="max-w-sm rounded-xl border border-red-100 bg-red-50 p-4">
                            <p className="text-sm text-red-800">Para desativar, confirme sua senha do portal.</p>
                            <input type="password" value={disableForm.data.password} onChange={event => disableForm.setData('password', event.target.value)} required autoComplete="current-password" className="mt-3 w-full rounded-lg border-red-200" placeholder="Senha atual" />
                            {disableForm.errors.password && <p className="mt-1 text-sm text-red-600">{disableForm.errors.password}</p>}
                            <button disabled={disableForm.processing} className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">Desativar duplo fator</button>
                        </form>
                    </div>
                )}

                <Link href="/portal/dashboard" className="mt-6 inline-block text-sm text-[#557bbb] underline">Voltar ao painel</Link>
            </div>
        </PortalLayout>
    );
}
