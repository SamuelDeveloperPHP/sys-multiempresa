import { useEffect, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';
import { getAuthMarker } from '@/offline/authMarker';
import { isBiometriaActive } from '@/Components/Mobile/BiometriaSetup';
import { loginBiometric, isSupported as bioApiSupported, friendlyError } from '@/offline/webauthn';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true,  // Default true — bom para app mobile (sessão longa)
    });

    // Detecta online/offline (não usa useOnlineStatus do offline/ para manter a
    // página de login leve e independente do bundle do app mobile).
    const [online, setOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    // Marker de "este usuário já logou aqui antes" — lido do localStorage.
    // Se existe E está offline, oferecemos bypass automático para /mobile/veiculos.
    const [marker, setMarker] = useState(null);
    const [bypassing, setBypassing] = useState(false);

    useEffect(() => {
        setMarker(getAuthMarker());
    }, []);

    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    // AUTO-BYPASS quando offline + marker existe: redireciona automaticamente
    // para /mobile/veiculos (que está cacheado pelo SW). O React vai renderizar
    // com auth.user lido do JSON Inertia cacheado, sem precisar de servidor.
    // Só funciona para motoristas (type='motorista') — admins fazem login normal.
    useEffect(() => {
        if (!online && marker?.id && marker?.type === 'motorista' && !bypassing) {
            setBypassing(true);
            // Pequeno delay para o usuário ver a mensagem antes do redirect
            const timer = setTimeout(() => {
                window.location.href = '/mobile/veiculos';
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [online, marker, bypassing]);

    const submit = (e) => {
        e.preventDefault();
        if (!online) {
            // Não tenta postar offline (vai falhar com erro feio de rede).
            // Mostra mensagem amigável e mantém o form.
            return;
        }
        post('/login');
    };

    const openOfflineApp = () => {
        window.location.href = '/mobile/veiculos';
    };

    // ===== Biometria (WebAuthn) =====
    const [bioSupported, setBioSupported] = useState(false);
    const [bioActive, setBioActive] = useState(false);
    const [bioWorking, setBioWorking] = useState(false);
    const [bioError, setBioError] = useState(null);

    useEffect(() => {
        const supported = bioApiSupported();
        setBioSupported(supported);
        setBioActive(supported && isBiometriaActive());
    }, []);

    const handleBiometricLogin = async () => {
        if (!online || bioWorking) return;
        setBioError(null);
        setBioWorking(true);
        try {
            const response = await loginBiometric(data.email || null);

            if (response.success) {
                // Login OK — redireciona para o módulo mobile
                window.location.href = '/mobile/veiculos';
            } else {
                throw response.error || new Error('Falha na autenticação.');
            }
        } catch (err) {
            console.error('[Login biometria] erro:', err);
            setBioError(friendlyError(err, 'autenticação biométrica'));
        } finally {
            setBioWorking(false);
        }
    };

    return (
        <AuthLayout>
            <Head title="Acesso Administrativo" />
            
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Bem-vindo(a) de volta</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Insira suas credenciais para acessar os projetos.
                </p>
            </div>

            {status && <div className="mt-4 font-medium text-sm text-green-600">{status}</div>}

            {/* Banner de status offline (PWA em campo) */}
            {!online && marker?.id && marker?.type === 'motorista' && (
                <div className="mt-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3">
                    <i className={`fa-solid ${bypassing ? 'fa-arrow-right-to-bracket fa-bounce' : 'fa-circle-check'} text-emerald-600 mt-0.5`} />
                    <div className="text-xs flex-1">
                        <p className="font-semibold mb-0.5">
                            {bypassing ? 'Abrindo modo offline…' : `Bem-vindo de volta, ${marker.name?.split(' ')[0] || ''}`}
                        </p>
                        <p className="text-emerald-700 leading-relaxed">
                            Você já tem acesso liberado neste dispositivo.
                            {bypassing
                                ? ' Redirecionando para Veículos…'
                                : ' Vamos abrir o app com seus dados em cache.'}
                        </p>
                        {!bypassing && (
                            <button
                                type="button"
                                onClick={openOfflineApp}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                                <i className="fa-solid fa-arrow-right" />
                                Abrir aplicativo offline
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!online && (!marker?.id || marker?.type !== 'motorista') && (
                <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">
                    <i className="fa-solid fa-wifi-slash text-amber-600 mt-0.5" />
                    <div className="text-xs">
                        <p className="font-semibold mb-0.5">Você está offline</p>
                        <p className="text-amber-700 leading-relaxed">
                            Para fazer login pela primeira vez você precisa de internet.
                            Se já entrou aqui antes e está em modo offline, abra direto o
                            aplicativo a partir do ícone na tela inicial.
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail corporativo</label>
                        <div className="mt-1">
                            <input type="email" required autoFocus autoComplete="username"
                                value={data.email} onChange={e => setData('email', e.target.value)}
                                className={`appearance-none block w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm bg-white placeholder-gray-400`} 
                                placeholder="nome@empresa.com" />
                            {errors.email && <p className="mt-2 text-sm text-red-600 font-medium">{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="mt-1">
                            <input type="password" required autoComplete="current-password"
                                value={data.password} onChange={e => setData('password', e.target.value)}
                                className={`appearance-none block w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm bg-white`} 
                                placeholder="••••••••" />
                            {errors.password && <p className="mt-2 text-sm text-red-600 font-medium">{errors.password}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input id="remember" name="remember" type="checkbox" checked={data.remember} onChange={e => setData('remember', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded text-blue-600 focus:ring-offset-0 transition-colors" />
                        <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
                            Lembrar neste dispositivo
                        </label>
                    </div>

                    {canResetPassword && (
                        <div className="text-sm">
                            <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                Esqueceu a senha?
                            </Link>
                        </div>
                    )}
                </div>

                <div>
                    <button type="submit" disabled={processing || !online}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {!online ? (
                            <><i className="fa-solid fa-wifi-slash mr-2" /> Sem internet</>
                        ) : processing ? 'Autenticando...' : 'Acessar o Painel'}
                    </button>
                </div>

                {/* ============= Botão Biometria ============= */}
                {bioSupported && bioActive && online && (
                    <>
                        <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-white text-gray-500">ou</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleBiometricLogin}
                            disabled={bioWorking}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-[#557bbb] rounded-xl text-sm font-semibold text-[#557bbb] bg-white hover:bg-[#eef2f9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#557bbb] transition-all disabled:opacity-50"
                        >
                            {bioWorking ? (
                                <><i className="fa-solid fa-spinner fa-spin" /> Aguardando biometria…</>
                            ) : (
                                <><i className="fa-solid fa-fingerprint text-lg" /> Entrar com biometria</>
                            )}
                        </button>

                        {bioError && (
                            <p className="text-xs text-red-600 font-medium text-center">
                                {bioError}
                            </p>
                        )}
                    </>
                )}
            </form>
        </AuthLayout>
    );
}
