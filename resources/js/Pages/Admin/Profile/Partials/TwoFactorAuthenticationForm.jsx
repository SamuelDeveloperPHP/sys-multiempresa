import { useState } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { grantOfflineSecondFactor, startOfflineSession } from '@/offline/offlineAuth';

export default function TwoFactorAuthenticationForm({ className = '', user, requiresSetup, qrCodeUrl, secret, recoveryCodes = [] }) {
    const { auth } = usePage().props;
    const [showDisable, setShowDisable] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        password: '',
    });

    const isEnabled = user.google2fa_enabled;
    const isRequired = !!auth?.two_factor?.required;

    const toggleTwoFactor = () => {
        if (!isEnabled) {
            generateSecret();
            return;
        }

        if (!isRequired) setShowDisable(true);
    };

    const generateSecret = () => {
        router.post(route('profile.2fa.generate'), {}, { preserveScroll: true });
    };

    const disable2fa = () => {
        if(confirm('Tem certeza que deseja desativar a autenticação de 2 fatores? Isso reduzirá a segurança da sua conta.')) {
            router.post(route('profile.2fa.disable'), { password: data.password }, { preserveScroll: true });
        }
    };

    const enable2fa = (e) => {
        e.preventDefault();
        post(route('profile.2fa.enable'), {
            preserveScroll: true,
            onSuccess: async (page) => {
                const currentUser = page?.props?.auth?.user || user;
                await grantOfflineSecondFactor(currentUser);
                await startOfflineSession(currentUser);
                reset('code');
            },
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
                    Autenticação em Dois Fatores (2FA)
                </h2>
                <div className="mt-1 text-sm text-gray-600 mb-6 space-y-2">
                    <p>Adicione segurança extra à sua conta utilizando autenticação em dois passos.</p>
                    {isRequired && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                            Este recurso é obrigatório para o seu perfil de acesso.
                        </p>
                    )}
                </div>
            </header>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div>
                    <p className="font-semibold text-gray-900">Duplo fator no login</p>
                    <p className="mt-1 text-sm text-gray-600">
                        {isEnabled
                            ? 'Ativado — sua conta solicita um código de segurança ao entrar.'
                            : 'Desativado — ative para adicionar uma camada extra de proteção.'}
                    </p>
                    {isRequired && isEnabled && (
                        <p className="mt-1 text-xs font-medium text-amber-700">Obrigatório para este perfil de acesso.</p>
                    )}
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={isEnabled ? 'Desativar duplo fator' : 'Ativar duplo fator'}
                    title={isRequired && isEnabled ? 'Obrigatório para este perfil' : undefined}
                    disabled={isRequired && isEnabled}
                    onClick={toggleTwoFactor}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#557bbb] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${isEnabled ? 'bg-emerald-600' : 'bg-gray-300'}`}
                >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {!isEnabled && !requiresSetup && (
                <div className="mt-6">
                    <p className="text-sm text-gray-900 font-medium mb-4">
                        Quando ativada, você precisará informar um código seguro gerado pelo seu celular (ex: Google Authenticator) sempre que for fazer login.
                    </p>
                    <p className="text-xs text-gray-500">Use a opção acima para iniciar a ativação.</p>
                </div>
            )}

            {requiresSetup && !isEnabled && (
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-2">Para concluir a ativação:</h3>
                    <ol className="list-decimal ml-4 text-sm text-gray-700 space-y-2 mb-6">
                        <li>Baixe um aplicativo autenticador como Google Authenticator ou Authy no seu celular.</li>
                        <li>Escaneie o QR Code abaixo com a câmera através do aplicativo.</li>
                        <li>Digite o código de 6 dígitos gerado pelo aplicativo no campo abaixo.</li>
                    </ol>

                    <div className="flex flex-col sm:flex-row gap-8 items-center mb-8">
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            {qrCodeUrl && (
                                <QRCodeSVG value={qrCodeUrl} size={150} level={"H"} />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Ou insira a chave secreta manualmente:</p>
                            <code className="bg-white px-3 py-2 border border-gray-200 rounded text-sm text-gray-800 block select-all">
                                {secret}
                            </code>
                        </div>
                    </div>

                    <form onSubmit={enable2fa} className="max-w-xs">
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700">Código de Verificação</label>
                        <input
                            id="code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#557bbb] focus:ring focus:ring-[#557bbb] focus:ring-opacity-50 text-center font-mono text-xl tracking-widest"
                            placeholder="000000"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            required
                        />
                        {errors.code && <p className="text-sm text-red-600 mt-2">{errors.code}</p>}

                        <div className="mt-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => router.post(route('profile.2fa.disable'))}
                                className="text-sm text-gray-600 hover:text-gray-900 underline"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={processing}
                                className="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                            >
                                Validar e Ativar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isEnabled && (
                <div className="mt-6">
                    <p className="text-sm text-gray-900 font-medium mb-4">
                        Sua conta está protegida. A autenticação de dois fatores está ativa.
                    </p>
                    {Array.isArray(recoveryCodes) && recoveryCodes.length > 0 && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="font-semibold text-amber-900">Guarde estes códigos de recuperação agora</p>
                            <p className="mt-1 text-xs text-amber-800">Cada código pode ser usado uma única vez. Eles não serão exibidos novamente.</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-amber-950">
                                {recoveryCodes.map(code => <code key={code}>{code}</code>)}
                            </div>
                        </div>
                    )}

                    {!isRequired && showDisable && (
                        <div className="max-w-sm space-y-3">
                            <div>
                                <label htmlFor="disable-2fa-password" className="block text-sm font-medium text-gray-700">Confirme sua senha para desativar</label>
                                <input
                                    id="disable-2fa-password"
                                    type="password"
                                    value={data.password}
                                    onChange={event => setData('password', event.target.value)}
                                    autoComplete="current-password"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                />
                                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={disable2fa}
                                    type="button"
                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-6 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                >
                                    Confirmar desativação
                                </button>
                                <button type="button" onClick={() => setShowDisable(false)} className="text-sm text-gray-600 hover:text-gray-900 underline">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
