// resources/js/Pages/Mobile/Perfil/AlterarSenha.jsx
// -----------------------------------------------------------------------------
// Alterar senha — port do legado (DadosAcesso/index.js).
//
// REGRAS:
//   - Disponível APENAS online
//   - Validações no client (UX) + server (autoridade):
//     * Senha atual confere (server)
//     * Nova senha 8+ chars, letras + números (validação Laravel Password)
//     * Não pode ser de vazamento (HIBP via Laravel `uncompromised`)
//     * password_confirmation deve bater
//   - Barra de força visual (4 níveis)
//   - Detecta sequência numérica (1234, 9876)
//   - Após sucesso: modal de countdown 5s → logout automático
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MobileLayout from '@/Layouts/MobileLayout';
import apiClient from '@/offline/api/client';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

// ===== Helpers =====
const hasUpper  = (s) => /[A-Z]/.test(s);
const hasLower  = (s) => /[a-z]/.test(s);
const hasDigit  = (s) => /\d/.test(s);
const hasSymbol = (s) => /[^\w\s]/.test(s);

const isSequentialDigits = (s, minRun = 4) => {
    let runAsc = 1, runDesc = 1;
    for (let i = 1; i < s.length; i++) {
        const prev = s[i - 1];
        const curr = s[i];
        if (/\d/.test(prev) && /\d/.test(curr)) {
            const p = prev.charCodeAt(0) - 48;
            const c = curr.charCodeAt(0) - 48;
            if (c - p === 1) { runAsc++; if (runAsc >= minRun) return true; } else { runAsc = 1; }
            if (c - p === -1){ runDesc++; if (runDesc >= minRun) return true; } else { runDesc = 1; }
        } else {
            runAsc = 1; runDesc = 1;
        }
    }
    return false;
};

export default function AlterarSenha() {
    const { online } = useOnlineStatus();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConf, setShowConf] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Força da senha (0-4)
    const strength = useMemo(() => {
        if (!newPass) return 0;
        const seq = isSequentialDigits(newPass);
        const conds = [
            newPass.length >= 8,
            hasUpper(newPass),
            hasLower(newPass),
            hasDigit(newPass),
            hasSymbol(newPass),
        ];
        let score = 0;
        conds.forEach(c => { if (c) score++; });
        if (score > 4) score = 4;
        if (seq) score = Math.min(score, 1);
        return score;
    }, [newPass]);

    const isValid = online
        && oldPass.length > 0
        && newPass.length >= 8
        && hasDigit(newPass)
        && hasLower(newPass)
        && !isSequentialDigits(newPass)
        && confirm.length > 0
        && newPass === confirm;

    // Countdown após sucesso → logout
    useEffect(() => {
        if (!success) return;
        const timer = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(timer);
                    // dispara logout
                    router.post('/logout');
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [success]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!online) {
            setError('Alterar senha requer conexão online.');
            return;
        }
        if (!isValid) {
            if (isSequentialDigits(newPass)) {
                setError('Evite sequências numéricas (ex: 1234, 9876).');
                return;
            }
            if (newPass.length < 8) {
                setError('Nova senha deve ter pelo menos 8 caracteres.');
                return;
            }
            if (newPass !== confirm) {
                setError('Confirmação não bate com a nova senha.');
                return;
            }
            setError('Preencha todos os campos corretamente.');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await apiClient.put('/users/change-password', {
                current_password: oldPass,
                password: newPass,
                password_confirmation: confirm,
            });
            setSuccess(true);
            setCountdown(5);
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            let msg = data?.message || 'Não foi possível alterar a senha.';
            // Pega primeira mensagem de validation Laravel se houver
            if (data?.errors) {
                const firstKey = Object.keys(data.errors)[0];
                msg = data.errors[firstKey]?.[0] || msg;
            }
            if (/data leak|uncompromised|pwned/i.test(msg)) {
                msg = 'Esta senha apareceu em vazamentos públicos. Escolha outra.';
            } else if (/current.password/i.test(msg)) {
                msg = 'Senha atual incorreta.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout header="Alterar senha" backUrl="/mobile/perfil" hideBottomNav>
            <Head title="Alterar senha" />

            <div className="p-3 space-y-4">
                {/* Status online */}
                <div className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${
                    online
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                    <i className={`fa-solid ${online ? 'fa-shield-halved' : 'fa-wifi-slash'}`} />
                    <span>
                        {online
                            ? 'Você está online. Pode alterar a senha.'
                            : 'Sem conexão. Alteração de senha indisponível.'}
                    </span>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
                        <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Senha atual */}
                    <PasswordField
                        label="Senha atual"
                        value={oldPass}
                        onChange={setOldPass}
                        show={showOld}
                        onToggleShow={() => setShowOld(s => !s)}
                        icon="fa-lock"
                        disabled={loading || success}
                        autoComplete="current-password"
                    />

                    {/* Nova senha */}
                    <div>
                        <PasswordField
                            label="Nova senha (mínimo 8 caracteres)"
                            value={newPass}
                            onChange={setNewPass}
                            show={showNew}
                            onToggleShow={() => setShowNew(s => !s)}
                            icon="fa-key"
                            disabled={loading || success}
                            autoComplete="new-password"
                        />
                        {/* Barra de força */}
                        <div className="flex gap-1.5 mt-2">
                            {[0, 1, 2, 3].map((i) => {
                                const isSeq = isSequentialDigits(newPass);
                                const onLevel = strength >= i + 1;
                                const color = isSeq
                                    ? 'bg-red-500'
                                    : onLevel
                                        ? strength >= 4 ? 'bg-emerald-500' : strength >= 3 ? 'bg-amber-500' : 'bg-yellow-400'
                                        : 'bg-gray-200';
                                return (
                                    <div key={i} className={`h-1.5 flex-1 rounded-full ${color} transition-colors`} />
                                );
                            })}
                        </div>
                        {newPass.length > 0 && (
                            <p className="text-[10px] text-gray-500 mt-1">
                                {isSequentialDigits(newPass)
                                    ? <span className="text-red-600 font-semibold">⚠ Sequência numérica detectada</span>
                                    : strength >= 4
                                        ? <span className="text-emerald-600 font-semibold">✓ Senha forte</span>
                                        : strength >= 3
                                            ? <span className="text-amber-600">Senha razoável</span>
                                            : <span className="text-gray-500">Adicione maiúsculas, números e símbolos</span>}
                            </p>
                        )}
                    </div>

                    {/* Confirmação */}
                    <div>
                        <PasswordField
                            label="Confirmar nova senha"
                            value={confirm}
                            onChange={setConfirm}
                            show={showConf}
                            onToggleShow={() => setShowConf(s => !s)}
                            icon="fa-key"
                            disabled={loading || success}
                            autoComplete="new-password"
                        />
                        {confirm.length > 0 && newPass !== confirm && (
                            <p className="text-[10px] text-red-600 mt-1">As senhas não coincidem.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!isValid || loading || success}
                        className="w-full py-3 bg-[#e67e22] hover:bg-[#cf6e1d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        {loading ? (
                            <><i className="fa-solid fa-spinner fa-spin" /> Salvando…</>
                        ) : (
                            <><i className="fa-solid fa-save" /> Salvar nova senha</>
                        )}
                    </button>
                </form>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800 space-y-1">
                    <p className="font-semibold">Requisitos de segurança:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        <li>Mínimo 8 caracteres</li>
                        <li>Letras e números obrigatórios</li>
                        <li>Sem sequências numéricas (1234, 9876)</li>
                        <li>Não pode ser uma senha que apareceu em vazamentos públicos</li>
                    </ul>
                </div>
            </div>

            {/* Modal de sucesso */}
            {success && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-check text-3xl text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Senha alterada com sucesso!
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Por segurança, vamos te deslogar em{' '}
                            <span className="text-2xl font-extrabold text-emerald-600">{countdown}</span>
                            {' '}segundos.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm"
                        >
                            Sair agora
                        </button>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
}

// =============================================================================
// PasswordField
// =============================================================================
function PasswordField({ label, value, onChange, show, onToggleShow, icon, disabled, autoComplete }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <div className="relative">
                <i className={`fa-solid ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm`} />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb] disabled:bg-gray-50"
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                >
                    <i className={`fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
            </div>
        </div>
    );
}
