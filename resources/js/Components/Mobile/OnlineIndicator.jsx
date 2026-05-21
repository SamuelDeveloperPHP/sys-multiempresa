// resources/js/Components/Mobile/OnlineIndicator.jsx
import useOnlineStatus from '@/offline/hooks/useOnlineStatus';

export default function OnlineIndicator({ compact = false }) {
    const { online, lastChecked } = useOnlineStatus();

    if (compact) {
        return (
            <span
                title={online ? `Online${lastChecked ? ' (verificado ' + lastChecked.toLocaleTimeString() + ')' : ''}` : 'Offline'}
                className={`inline-block w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'} ${online ? 'animate-pulse' : ''}`}
            />
        );
    }

    return (
        <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                online
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
            }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {online ? 'Online' : 'Offline'}
        </div>
    );
}
