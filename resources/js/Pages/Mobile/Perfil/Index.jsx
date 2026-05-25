// resources/js/Pages/Mobile/Perfil/Index.jsx
// -----------------------------------------------------------------------------
// Perfil do motorista — port do legado (engeativos RN/Usuarios/Perfil).
//
// Mostra:
//   - Avatar (foto do funcionário ou fallback)
//   - Nome, e-mail, status conexão
//   - Botões: Alterar senha (só online) | Editar perfil (em breve)
//   - Switches: Biometria | Geolocalização (preferência guardada em localStorage)
//   - Dados read-only: unidade de trabalho, nome, e-mail, função, contato
//   - QR Code com matrícula (160px)
//   - Links LGPD
//
// Carrega via /api/mobile/users/me. Cache local em localStorage permite ver
// dados offline. Foto fica em CacheStorage do SW (URL de imagem).
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { QRCodeCanvas } from 'qrcode.react';
import MobileLayout from '@/Layouts/MobileLayout';
import apiClient from '@/offline/api/client';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';
import BiometriaSetup from '@/Components/Mobile/BiometriaSetup';
import { logoutSafely } from '@/offline/logout';

const STORAGE_PROFILE = 'sga_user_profile_cache';
const STORAGE_PREFS   = 'sga_user_prefs';

function loadCache() {
    try {
        const raw = localStorage.getItem(STORAGE_PROFILE);
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}
function saveCache(data) {
    try { localStorage.setItem(STORAGE_PROFILE, JSON.stringify(data)); } catch (_) {}
}
function loadPrefs() {
    try {
        const raw = localStorage.getItem(STORAGE_PREFS);
        return raw ? JSON.parse(raw) : { biometria: false, geolocalizacao: false };
    } catch (_) { return { biometria: false, geolocalizacao: false }; }
}
function savePrefs(prefs) {
    try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs)); } catch (_) {}
}

export default function PerfilIndex() {
    const { auth } = usePage().props;
    const { online } = useOnlineStatus();
    const [profile, setProfile] = useState(loadCache());
    const [loading, setLoading] = useState(false);
    const [prefs, setPrefs] = useState(loadPrefs());
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!online) return;
        (async () => {
            setLoading(true);
            try {
                const { data } = await apiClient.get('/users/me');
                if (data?.status) {
                    setProfile(data);
                    saveCache(data);
                    setImageError(false);
                }
            } catch (e) { /* silencioso — usa cache */ }
            finally { setLoading(false); }
        })();
    }, [online]);

    const togglePref = (key) => {
        const next = { ...prefs, [key]: !prefs[key] };
        setPrefs(next);
        savePrefs(next);
    };

    const user = profile?.user || { name: auth?.user?.name, email: auth?.user?.email };
    const funcionario = profile?.funcionario;
    const obra = profile?.obra;
    const funcao = profile?.funcao;

    const matricula = funcionario?.matricula || `USR-${user?.id || '0'}`;
    const fotoUrl = funcionario?.imagem_usuario
        ? `https://sga-engeativos.com.br/build/images/users/${funcionario.id}/${funcionario.imagem_usuario}`
        : null;

    const initials = (user?.name || 'U')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0])
        .join('')
        .toUpperCase();

    return (
        <MobileLayout header="Meu Perfil" backUrl="/mobile/dashboard">
            <Head title="Meu Perfil" />

            <div className="p-3 space-y-3">
                {/* ============= HERO ============= */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {fotoUrl && !imageError ? (
                                <img
                                    src={fotoUrl}
                                    alt={user?.name}
                                    onError={() => setImageError(true)}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-[#557bbb]/20"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#557bbb] to-[#3a5a8c] flex items-center justify-center text-white text-2xl font-bold border-2 border-[#557bbb]/20">
                                    {initials}
                                </div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-bold text-gray-900 truncate">
                                {funcionario?.nome || user?.name || 'Usuário'}
                            </h2>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                                <i className={`fa-solid ${online ? 'fa-wifi text-emerald-600' : 'fa-wifi-slash text-amber-600'} text-xs`} />
                                <span className={`text-[11px] font-semibold ${online ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {online ? 'ONLINE' : 'OFFLINE'}
                                </span>
                                {loading && (
                                    <span className="text-[11px] text-gray-400">
                                        <i className="fa-solid fa-spinner fa-spin mr-1" />Atualizando…
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <Link
                            href="/mobile/perfil/alterar-senha"
                            disabled={!online}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs transition-colors ${
                                online
                                    ? 'bg-[#557bbb] hover:bg-[#3a5a8c] text-white'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            onClick={(e) => { if (!online) e.preventDefault(); }}
                        >
                            <i className="fa-solid fa-lock" />
                            <span>Alterar senha</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => alert('Em breve: edição de perfil.')}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs bg-orange-100 text-[#e67e22] hover:bg-orange-200"
                        >
                            <i className="fa-solid fa-pencil" />
                            <span>Editar perfil</span>
                        </button>
                    </div>
                    {!online && (
                        <p className="text-[10px] text-amber-600 text-center mt-2">
                            <i className="fa-solid fa-circle-info mr-1" />
                            Alteração de senha disponível apenas online.
                        </p>
                    )}
                </div>

                {/* ============= SEGURANÇA ============= */}
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Segurança</h3>

                    {/* Biometria real (WebAuthn) */}
                    <BiometriaSetup />

                    <div className="border-t border-gray-100 pt-3">
                        <PrefRow
                            icon="fa-location-dot"
                            iconColor={prefs.geolocalizacao ? 'text-emerald-600' : 'text-gray-400'}
                            label="Geolocalização"
                            value={prefs.geolocalizacao}
                            onToggle={() => togglePref('geolocalizacao')}
                        />
                    </div>
                </div>

                {/* ============= DADOS PESSOAIS ============= */}
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dados pessoais</h3>

                    <InfoRow icon="fa-building" iconColor="text-orange-500" label="Unidade de trabalho"
                        value={obra?.codigo_obra || obra?.nome || 'Não disponível'} />

                    <InfoRow icon="fa-user" iconColor="text-orange-500" label="Nome completo"
                        value={funcionario?.nome || user?.name || 'Não disponível'} />

                    <InfoRow icon="fa-envelope" iconColor="text-orange-500" label="E-mail"
                        value={user?.email || 'Não disponível'} />

                    <InfoRow icon="fa-id-badge" iconColor="text-orange-500" label="Função"
                        value={funcao?.funcao || 'Não disponível'} />

                    <InfoRow icon="fa-phone" iconColor="text-orange-500" label="Contato"
                        value={funcionario?.celular || 'Não disponível'} />
                </div>

                {/* ============= QR CODE MATRÍCULA ============= */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                        Minha matrícula
                    </h3>
                    <div className="flex flex-col items-center py-2">
                        <div className="bg-white p-3 rounded-xl border-2 border-gray-100">
                            <QRCodeCanvas value={matricula} size={160} level="M" includeMargin={false} />
                        </div>
                        <p className="mt-3 text-sm font-bold text-gray-800">{matricula}</p>
                        <p className="text-[11px] text-gray-500 mt-1">
                            Apresente este QR ao supervisor quando solicitado.
                        </p>
                    </div>
                </div>

                {/* ============= LEGAL ============= */}
                <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-gray-400">
                    <a href="https://sga-engeativos.com.br/privacidade" target="_blank" rel="noreferrer"
                        className="text-[#557bbb] underline">
                        Política de Privacidade
                    </a>
                    <span>•</span>
                    <a href="https://sga-engeativos.com.br/suporte" target="_blank" rel="noreferrer"
                        className="text-[#557bbb] underline">
                        Termos e Suporte
                    </a>
                </div>

                {/* ============= LOGOUT (safe-offline) ============= */}
                {/* Não usa Inertia Link/method=post — quando offline, tentava
                    bater no servidor e gerava ERR_INTERNET_DISCONNECTED em loop.
                    logoutSafely decide em runtime: online → POST /logout;
                    offline → limpa storage e vai direto pra /login. */}
                <button
                    type="button"
                    onClick={() => logoutSafely()}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <i className="fa-solid fa-right-from-bracket" />
                    Sair da conta
                </button>
            </div>
        </MobileLayout>
    );
}

// =============================================================================
// Subcomponents
// =============================================================================
function PrefRow({ icon, iconColor, label, value, onToggle }) {
    return (
        <div className="flex items-center gap-3">
            <i className={`fa-solid ${icon} ${iconColor} text-lg w-6 text-center`} />
            <span className="flex-1 text-sm text-gray-700">{label}</span>
            <button
                type="button"
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
                aria-pressed={value}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        value ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}

function InfoRow({ icon, iconColor, label, value }) {
    return (
        <div>
            <p className="text-[11px] text-gray-500 font-medium mb-0.5">{label}</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <i className={`fa-solid ${icon} ${iconColor} text-sm w-4 text-center`} />
                <span className="text-sm text-gray-800 truncate flex-1">{value}</span>
            </div>
        </div>
    );
}
