import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';

export default function TwoFactorAuthenticationForm({ className = '', user, requiresSetup, qrCodeUrl, secret }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
    });

    const isEnabled = user.google2fa_enabled;

    const generateSecret = () => {
        router.post(route('profile.2fa.generate'), {}, { preserveScroll: true });
    };

    const disable2fa = () => {
        if(confirm('Tem certeza que deseja desativar a autenticação de 2 fatores? Isso reduzirá a segurança da sua conta.')) {
            router.post(route('profile.2fa.disable'), {}, { preserveScroll: true });
        }
    };

    const enable2fa = (e) => {
        e.preventDefault();
        post(route('profile.2fa.enable'), {
            preserveScroll: true,
            onSuccess: () => reset(),
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
                    {isEnabled ? (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            <span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
                            Ativada
                        </div>
                    ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                            <span className="w-2 h-2 mr-2 bg-gray-400 rounded-full"></span>
                            Desativada
                        </div>
                    )}
                </div>
            </header>

            {!isEnabled && !requiresSetup && (
                <div className="mt-6">
                    <p className="text-sm text-gray-900 font-medium mb-4">
                        Quando ativada, você precisará informar um código seguro gerado pelo seu celular (ex: Google Authenticator) sempre que for fazer login.
                    </p>
                    <button
                        onClick={generateSecret}
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-[#557bbb] py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-[#009b80] focus:outline-none focus:ring-2 focus:ring-[#557bbb] focus:ring-offset-2"
                    >
                        Configurar Autenticação de Dois Fatores
                    </button>
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
                    <button
                        onClick={disable2fa}
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-6 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Desativar 2FA
                    </button>
                </div>
            )}
        </section>
    );
}
