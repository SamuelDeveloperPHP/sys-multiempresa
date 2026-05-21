// resources/js/Components/Mobile/InstallPrompt.jsx
// -----------------------------------------------------------------------------
// Banner discreto sugerindo instalar como PWA. Dispensável e auto-some quando
// o usuário aceita ou descarta.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import useInstallPrompt from '@/offline/hooks/useInstallPrompt';

export default function InstallPrompt() {
    const { canInstall, install } = useInstallPrompt();
    const [dismissed, setDismissed] = useState(
        typeof localStorage !== 'undefined' && localStorage.getItem('install_dismissed') === '1'
    );

    if (!canInstall || dismissed) return null;

    const handleDismiss = () => {
        localStorage.setItem('install_dismissed', '1');
        setDismissed(true);
    };

    const handleInstall = async () => {
        const accepted = await install();
        if (!accepted) handleDismiss();
    };

    return (
        <div className="fixed bottom-4 left-3 right-3 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#1abc9c] to-[#00BCD4] flex items-center justify-center text-white font-bold flex-shrink-0">
                <i className="fa-solid fa-download" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Instalar SGA no celular</p>
                <p className="text-[11px] text-gray-500 leading-tight">Funciona offline e abre como app.</p>
            </div>
            <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1"
                title="Dispensar"
            >
                <i className="fa-solid fa-xmark" />
            </button>
            <button
                onClick={handleInstall}
                className="bg-[#557bbb] hover:bg-[#3f63a0] text-white text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
            >
                Instalar
            </button>
        </div>
    );
}
