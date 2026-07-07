// resources/js/Pages/Auth/Login.jsx
// -----------------------------------------------------------------------------
// Tela de login — port das funcionalidades do legado (RN) para PWA/web.
//
// Funcionalidades:
//   - Login normal (POST /login via Inertia) quando online. No sucesso,
//     PROVISIONA a credencial offline (PBKDF2 — offline/offlineAuth.js §5)
//   - Login OFFLINE com senha: valida contra o hash PBKDF2 local em tempo
//     constante (substitui o antigo bypass sem senha via authMarker)
//   - Login biométrico (WebAuthn) quando suportado + ativado
//   - Banner de status de rede em 4 estados (online bom, sinal fraco, sem
//     conexão, modo offline manual)
//   - Checkbox "Acessar sem internet" — força modo offline mesmo com sinal OK
//   - Toggle show/hide password (ícone eye / eye-slash)
//   - Botão dinâmico: "Acessar (ONLINE)" azul vs "Acessar (OFFLINE)" laranja
//   - Auto-redirect quando offline + SESSÃO offline ainda válida (timer 1.2s)
//
// Inspirado em: C:\wamp64\www\app_engeativos_v002\src\pages\Login\index.js
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';
import { isBiometriaActive } from '@/Components/Mobile/BiometriaSetup';
import { loginBiometric, isSupported as bioApiSupported, friendlyError } from '@/offline/webauthn';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import {
    provisionCredential,
    getCredential,
    verifyOfflinePassword,
    getOfflineSession,
    startOfflineSession,
} from '@/offline/offlineAuth';

// Avalia qualidade do sinal via Network Information API (quando disponível).
// Retorna 'good' | 'fair' | 'poor'. Usado para sugerir login OFFLINE quando
// a internet está ligada mas instável.
function getSignalQuality() {
    if (typeof navigator === 'undefined' || !navigator.connection) return 'good';
    const conn = navigator.connection;
    const eff = conn.effectiveType; // '4g' | '3g' | '2g' | 'slow-2g'
    if (conn.saveData) return 'fair';
    if (eff === 'slow-2g' || eff === '2g') return 'poor';
    if (eff === '3g') return 'fair';
    return 'good';
}

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true,
    });

    // Status de conexão real (ping + navigator + modo forçado)
    const { online, deviceOffline, forcedOffline, setForcedOffline } = useOnlineStatus();

    // Credencial offline provisionada (PBKDF2 no IndexedDB) + sessão offline ativa
    const [offlineCred, setOfflineCred] = useState(null);
    const [offlineSession, setOfflineSession] = useState(null);
    const [offlineError, setOfflineError] = useState(null);
    const [offlineWorking, setOfflineWorking] = useState(false);
    const [bypassing, setBypassing] = useState(false);

    // Estado da senha (toggle visibility)
    const [showPassword, setShowPassword] = useState(false);

    // Qualidade do sinal (para banner informativo)
    const [signal, setSignal] = useState(() => getSignalQuality());

    // Modo efetivo do login (decide o que o botão faz e como aparece)
    //   - 'online'  : faz POST /login (requer internet)
    //   - 'offline' : valida a senha contra o hash PBKDF2 local
    // forcedOffline (checkbox) OU !online → modo offline
    const effectiveMode = (forcedOffline || !online) ? 'offline' : 'online';
    // Login offline exige credencial provisionada (1º acesso online já feito).
    const canOfflineLogin = !!offlineCred?.hash;

    useEffect(() => {
        getCredential().then(setOfflineCred).catch(() => {});
        getOfflineSession().then(setOfflineSession).catch(() => {});
    }, []);

    useEffect(() => {
        return () => reset('password');
    }, []);

    // Reavalia o sinal periodicamente (Network Info API muda conforme rede)
    useEffect(() => {
        const i = setInterval(() => setSignal(getSignalQuality()), 5000);
        return () => clearInterval(i);
    }, []);

    // AUTO-REDIRECT: quando o dispositivo está offline DE VERDADE (não forçado)
    // e ainda existe uma SESSÃO offline válida (não expirada), redireciona
    // automaticamente após 1.2s — o usuário "continua logado".
    // Sem sessão válida, fica na tela: o login offline exige senha.
    useEffect(() => {
        if (deviceOffline && offlineSession?.user_id && !bypassing) {
            setBypassing(true);
            const timer = setTimeout(() => {
                window.location.href = '/mobile/veiculos';
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [deviceOffline, offlineSession, bypassing]);

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

    // Submit: decide entre login online (POST) ou offline (PBKDF2 local)
    const submit = (e) => {
        e.preventDefault();
        setOfflineError(null);

        if (effectiveMode === 'offline') {
            // ===== LOGIN OFFLINE: valida a senha contra o hash PBKDF2 local =====
            if (!canOfflineLogin || offlineWorking) return;
            setOfflineWorking(true);
            verifyOfflinePassword(data.email, data.password)
                .then((res) => {
                    if (res.ok) {
                        window.location.href = '/mobile/veiculos';
                    } else {
                        setOfflineError(res.error || 'Não foi possível validar o acesso offline.');
                        setOfflineWorking(false);
                    }
                })
                .catch((err) => {
                    console.error('[Login offline] erro:', err);
                    setOfflineError('Erro ao validar o acesso offline.');
                    setOfflineWorking(false);
                });
            return;
        }

        // ===== LOGIN ONLINE: POST /login. No sucesso, provisiona a credencial
        // offline (o servidor acabou de validar esta senha) e abre a sessão.
        // Captura em variável local: o form pode ser resetado no redirect.
        const typedPassword = data.password;
        post('/login', {
            onSuccess: (page) => {
                const user = page?.props?.auth?.user;
                if (!user?.id) return;
                // Best-effort: falha aqui não pode atrapalhar o login online.
                provisionCredential(user, typedPassword)
                    .then((ok) => { if (ok) return startOfflineSession(user); })
                    .catch(() => {});
            },
        });
    };

    // ============= Banner de status de rede (texto + cor) =============
    let bannerIcon, bannerText, bannerSub, bannerBg;
    if (forcedOffline) {
        bannerIcon = 'fa-toggle-off text-slate-600';
        bannerText = 'Modo OFFLINE ativado manualmente';
        bannerSub = 'O login vai usar dados salvos neste dispositivo.';
        bannerBg = 'bg-slate-100 border-slate-300 text-slate-800';
    } else if (deviceOffline) {
        bannerIcon = 'fa-wifi-slash text-red-600';
        bannerText = 'Sem conexão — apenas OFFLINE disponível';
        bannerSub = offlineSession?.user_id
            ? 'Você ainda está logado — vamos abrir o app com seus dados.'
            : canOfflineLogin
                ? 'Digite sua senha para entrar no modo offline.'
                : 'Faça o primeiro acesso online para habilitar o modo offline.';
        bannerBg = 'bg-red-50 border-red-200 text-red-800';
    } else if (signal === 'poor' || signal === 'fair') {
        bannerIcon = 'fa-triangle-exclamation text-amber-600';
        bannerText = signal === 'poor' ? 'Sinal fraco — recomendado OFFLINE' : 'Conexão lenta';
        bannerSub = 'Marque "Acessar sem internet" para entrar mais rápido.';
        bannerBg = 'bg-amber-50 border-amber-200 text-amber-800';
    } else {
        bannerIcon = 'fa-circle-check text-emerald-600';
        bannerText = 'Sinal bom — login ONLINE recomendado';
        bannerSub = null;
        bannerBg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    }

    // ============= Visual do botão principal =============
    const buttonOnlineClasses  = 'bg-[#557bbb] hover:bg-[#3a5a8c] focus:ring-[#557bbb]';
    const buttonOfflineClasses = 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600';
    const buttonClasses = effectiveMode === 'online' ? buttonOnlineClasses : buttonOfflineClasses;

    const submitDisabled =
        processing
        || offlineWorking
        || (effectiveMode === 'online' && !online)
        || (effectiveMode === 'offline' && !canOfflineLogin);

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

            {/* ============= Auto-redirect: sessão offline ainda válida ============= */}
            {deviceOffline && offlineSession?.user_id && (
                <div className="mt-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3">
                    <i className={`fa-solid ${bypassing ? 'fa-arrow-right-to-bracket fa-bounce' : 'fa-circle-check'} text-emerald-600 mt-0.5`} />
                    <div className="text-xs flex-1">
                        <p className="font-semibold mb-0.5">
                            {bypassing ? 'Abrindo modo offline…' : `Bem-vindo de volta, ${offlineSession?.name?.split(' ')[0] || ''}`}
                        </p>
                        <p className="text-emerald-700 leading-relaxed">
                            Sua sessão offline ainda está ativa.
                            {bypassing
                                ? ' Redirecionando para Veículos…'
                                : ' Vamos abrir o app com seus dados em cache.'}
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-5">
                <div className="space-y-4">
                    {/* ============= E-MAIL ============= */}
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

                    {/* ============= SENHA com toggle de visibilidade ============= */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="mt-1 relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                className={`appearance-none block w-full px-4 py-3 pr-12 rounded-xl border ${errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm text-gray-900 shadow-sm bg-white`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                            {errors.password && <p className="mt-2 text-sm text-red-600 font-medium">{errors.password}</p>}
                        </div>
                    </div>
                </div>

                {/* ============= Banner de status de rede ============= */}
                <div className={`flex items-start gap-3 border rounded-xl p-3 text-xs ${bannerBg}`}>
                    <i className={`fa-solid ${bannerIcon} text-base mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold leading-tight">{bannerText}</p>
                        {bannerSub && <p className="opacity-80 leading-tight mt-0.5">{bannerSub}</p>}
                    </div>
                </div>

                {/* ============= Lembrar + Esqueci senha + Forçar offline ============= */}
                <div className="flex items-center justify-between flex-wrap gap-y-2">
                    <div className="flex items-center">
                        <input id="remember" type="checkbox" checked={data.remember} onChange={e => setData('remember', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded text-blue-600 focus:ring-offset-0 transition-colors" />
                        <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
                            Lembrar
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

                {/* ============= Checkbox: forçar modo offline ============= */}
                {canOfflineLogin && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={forcedOffline}
                            onChange={e => setForcedOffline(e.target.checked)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                            <i className="fa-solid fa-wifi-slash text-orange-500 mr-1" />
                            Acessar sem internet (modo OFFLINE)
                        </span>
                    </label>
                )}

                {/* ============= Erro do login offline ============= */}
                {offlineError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs">
                        <i className="fa-solid fa-circle-exclamation mt-0.5" />
                        <span className="flex-1">{offlineError}</span>
                    </div>
                )}

                {/* ============= BOTÃO PRINCIPAL ============= */}
                <div>
                    <button type="submit" disabled={submitDisabled}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses}`}>
                        {(processing || offlineWorking) ? (
                            <><i className="fa-solid fa-spinner fa-spin mr-2" /> Autenticando…</>
                        ) : effectiveMode === 'offline' ? (
                            canOfflineLogin ? (
                                <><i className="fa-solid fa-wifi-slash mr-2" /> Acessar (OFFLINE)</>
                            ) : (
                                <><i className="fa-solid fa-wifi-slash mr-2" /> Faça o primeiro acesso online</>
                            )
                        ) : (
                            <><i className="fa-solid fa-right-to-bracket mr-2" /> Acessar (ONLINE)</>
                        )}
                    </button>
                </div>

                {/* ============= BIOMETRIA ============= */}
                {bioSupported && bioActive && online && !forcedOffline && (
                    <>
                        <div className="relative my-1">
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

            {/* ============= Links LGPD ============= */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <div className="flex items-center justify-center gap-2 text-[11px]">
                    <a
                        href="https://sga-engeativos.com.br/privacidade"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#557bbb] hover:underline"
                    >
                        Política de Privacidade
                    </a>
                    <span className="text-gray-300">•</span>
                    <a
                        href="https://sga-engeativos.com.br/suporte"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#557bbb] hover:underline"
                    >
                        Termos e Suporte
                    </a>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                    Ao entrar, você concorda com nossa Política de Privacidade e Termos de Uso.
                </p>
            </div>
        </AuthLayout>
    );
}
