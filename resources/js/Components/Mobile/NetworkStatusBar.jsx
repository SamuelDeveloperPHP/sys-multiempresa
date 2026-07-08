// resources/js/Components/Mobile/NetworkStatusBar.jsx
// -----------------------------------------------------------------------------
// Banner de status de rede com switch para forçar modo offline manual.
// Inspirado no legado: src/components/NetworkBanner.js (RN).
//
// Aparece automaticamente quando:
//   - Dispositivo está offline (navigator.onLine false OU ping falhou)
//   - Usuário forçou offline manualmente
//
// Quando online normal: barra fica oculta (ou compacta, ver `alwaysVisible`).
//
// Switch: liga/desliga o modo "Forçar offline" — persistido em localStorage.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function NetworkStatusBar({ alwaysVisible = false }) {
    const {
        online,
        navigatorOnline,
        pingOk,
        forcedOffline,
        deviceOffline,
        lastChecked,
        toggleForcedOffline,
    } = useOnlineStatus();

    const [expanded, setExpanded] = useState(false);

    // Não renderiza nada quando totalmente online (a menos que `alwaysVisible`).
    if (online && !alwaysVisible) {
        return null;
    }

    // Estado visual
    let bg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    let icon = 'fa-wifi text-emerald-600';
    let label = 'Online';
    let subtitle = lastChecked ? `Verificado às ${lastChecked.toLocaleTimeString().slice(0, 5)}` : '';

    if (forcedOffline) {
        bg = 'bg-slate-100 border-slate-300 text-slate-800';
        icon = 'fa-toggle-off text-slate-600';
        label = 'Modo offline manual';
        subtitle = 'Sincronização pausada. Toque no botão para voltar online.';
    } else if (!navigatorOnline) {
        bg = 'bg-red-50 border-red-200 text-red-800';
        icon = 'fa-wifi-slash text-red-600';
        label = 'Sem conexão';
        subtitle = 'Dispositivo desconectado da internet.';
    } else if (!pingOk) {
        bg = 'bg-amber-50 border-amber-200 text-amber-800';
        icon = 'fa-triangle-exclamation text-amber-600';
        label = 'Sinal instável';
        subtitle = 'Conectado, mas servidor não responde. Trabalhando em modo offline.';
    }

    return (
        <div className={`border-b ${bg} text-xs`}>
            <div className="flex items-center gap-2 px-3 py-2">
                <i className={`fa-solid ${icon} text-base shrink-0`} />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{label}</p>
                    {subtitle && (
                        <p className="text-[10.5px] opacity-80 leading-tight truncate">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Botão expandir/contrair detalhes */}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="px-2 py-1 rounded text-[10.5px] font-semibold opacity-80 hover:opacity-100"
                    title="Opções"
                >
                    <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                </button>
            </div>

            {expanded && (
                <div className="px-3 pb-2 pt-1 flex items-center gap-3 border-t border-current/10">
                    <div className="flex-1 text-[10.5px] leading-snug opacity-90">
                        <p>
                            <strong>Forçar offline:</strong>{' '}
                            {forcedOffline
                                ? 'ON — o app não vai tentar sincronizar com o servidor.'
                                : 'OFF — o app sincroniza automaticamente quando houver internet.'}
                        </p>
                        <p className="opacity-70 mt-0.5">
                            Use quando a conexão estiver ruim e você quiser preservar bateria/dados.
                        </p>
                    </div>
                    <ToggleSwitch
                        value={forcedOffline}
                        onChange={toggleForcedOffline}
                        ariaLabel="Forçar modo offline"
                    />
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Toggle Switch reutilizável (exportado — usado também no Dashboard)
// =============================================================================
export function ToggleSwitch({ value, onChange, ariaLabel }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={value}
            aria-label={ariaLabel}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                value ? 'bg-slate-600' : 'bg-gray-300'
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}
