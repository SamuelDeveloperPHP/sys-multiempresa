// resources/js/Components/Mobile/OnlineIndicator.jsx
// -----------------------------------------------------------------------------
// Indicador discreto de status de rede no header do MobileLayout.
// Mostra 3 estados:
//   - VERDE: online (verificado via ping)
//   - VERMELHO: device offline (modo avião OU servidor inalcançável)
//   - CINZA: modo offline forçado manualmente pelo usuário
// -----------------------------------------------------------------------------

import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function OnlineIndicator({ compact = false }) {
    const { online, forcedOffline, deviceOffline, lastChecked } = useOnlineStatus();

    // Cores e textos
    let color;        // classe Tailwind para o ponto
    let pulse = '';
    let text;
    let title;

    if (forcedOffline) {
        color = 'bg-slate-500';
        text = 'Manual';
        title = 'Modo offline manual ativado';
    } else if (deviceOffline) {
        color = 'bg-red-500';
        text = 'Offline';
        title = 'Sem conexão com o servidor';
    } else {
        color = 'bg-emerald-500';
        pulse = 'animate-pulse';
        text = 'Online';
        title = `Online${lastChecked ? ' (verificado ' + lastChecked.toLocaleTimeString().slice(0, 5) + ')' : ''}`;
    }

    if (compact) {
        return (
            <span
                title={title}
                className={`inline-block w-2.5 h-2.5 rounded-full ${color} ${pulse}`}
            />
        );
    }

    return (
        <div
            title={title}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                online
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : forcedOffline
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-red-50 text-red-700 border-red-200'
            }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${color} ${pulse}`} />
            {text}
        </div>
    );
}
