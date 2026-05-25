// resources/js/Components/Mobile/BiometriaSetup.jsx
// -----------------------------------------------------------------------------
// Setup de biometria (WebAuthn / Passkey) — usa @laragear/webpass.
//
// REQUISITOS:
//   - HTTPS ou localhost (window.isSecureContext)
//   - Browser com PublicKeyCredential (Chrome 67+, Safari 14+, Firefox 60+)
//   - Dispositivo com plataforma de autenticação (Touch ID, Face ID, Windows
//     Hello, biometria Android, etc.)
//
// FLUXO:
//   1. Usuário clica "Configurar biometria"
//   2. Frontend chama POST /webauthn/register/options → recebe challenge
//   3. Browser invoca navigator.credentials.create() → biometria do dispositivo
//   4. Frontend envia attestation para POST /webauthn/register → server salva
//   5. Sucesso: marker em localStorage indica que biometria está ativa
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import Webpass from '@laragear/webpass';

const STORAGE_KEY = 'sga_webauthn_active';

export default function BiometriaSetup({ onChange }) {
    const [supported, setSupported] = useState(null); // null = checking
    const [active, setActive] = useState(false);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Detecta suporte ao montar
    useEffect(() => {
        const isSupported =
            typeof window !== 'undefined' &&
            window.isSecureContext &&
            'PublicKeyCredential' in window &&
            typeof navigator?.credentials?.create === 'function';
        setSupported(!!isSupported);
        setActive(localStorage.getItem(STORAGE_KEY) === '1');
    }, []);

    const handleEnable = async () => {
        if (!supported || working) return;
        setError(null);
        setSuccess(null);
        setWorking(true);

        try {
            // CSRF token Laravel
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
            const headers = csrf ? { 'X-CSRF-TOKEN': csrf } : {};

            const response = await Webpass.attest({
                attestOptions: '/webauthn/register/options',
                attest: '/webauthn/register',
                fetchOptions: {
                    credentials: 'same-origin',
                    headers,
                },
            });

            if (response.success) {
                localStorage.setItem(STORAGE_KEY, '1');
                setActive(true);
                setSuccess('Biometria configurada! Use sua impressão digital ou Face ID para entrar.');
                onChange?.(true);
            } else {
                throw new Error(response.message || 'Falha ao registrar biometria.');
            }
        } catch (err) {
            console.error('[BiometriaSetup] erro:', err);
            const msg = err?.message || String(err);
            if (/NotAllowedError|cancelled/i.test(msg)) {
                setError('Você cancelou a configuração da biometria.');
            } else if (/InvalidStateError/i.test(msg)) {
                setError('Este dispositivo já está cadastrado.');
            } else if (/NotSupportedError/i.test(msg)) {
                setError('Seu dispositivo não suporta biometria.');
            } else {
                setError('Erro ao configurar biometria: ' + msg);
            }
        } finally {
            setWorking(false);
        }
    };

    const handleDisable = () => {
        if (!confirm('Desativar biometria? Você precisará digitar email e senha no próximo login.')) {
            return;
        }
        // Apenas remove o marker local — credencial fica no servidor mas marker
        // off impede o botão "Entrar com biometria" de aparecer.
        // Para apagar credencial do servidor, usuário precisa contatar admin.
        localStorage.removeItem(STORAGE_KEY);
        setActive(false);
        setSuccess(null);
        setError(null);
        onChange?.(false);
    };

    if (supported === null) return null;

    if (!supported) {
        return (
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <i className="fa-solid fa-circle-info text-gray-400 mt-0.5" />
                <div>
                    <p className="font-semibold">Biometria não suportada</p>
                    <p className="mt-1 leading-relaxed">
                        Seu dispositivo ou navegador não tem suporte a Touch ID / Face ID / impressão digital,
                        ou você não está em conexão segura (HTTPS).
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <i className={`fa-solid fa-fingerprint text-lg w-6 text-center ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">Biometria</p>
                    <p className="text-[11px] text-gray-500">
                        {active ? 'Ativa neste dispositivo' : 'Desativada'}
                    </p>
                </div>
                {active ? (
                    <button
                        type="button"
                        onClick={handleDisable}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-md"
                    >
                        Desativar
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleEnable}
                        disabled={working}
                        className="px-3 py-1.5 bg-[#557bbb] hover:bg-[#3a5a8c] disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-1.5"
                    >
                        {working ? (
                            <><i className="fa-solid fa-spinner fa-spin" />Configurando…</>
                        ) : (
                            <><i className="fa-solid fa-fingerprint" />Ativar</>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2 text-xs">
                    <i className="fa-solid fa-circle-exclamation mr-1" />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md p-2 text-xs">
                    <i className="fa-solid fa-circle-check mr-1" />
                    {success}
                </div>
            )}
        </div>
    );
}

/**
 * Helper exportado pra outros componentes verificarem se biometria está ativa.
 */
export function isBiometriaActive() {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
        return false;
    }
}
