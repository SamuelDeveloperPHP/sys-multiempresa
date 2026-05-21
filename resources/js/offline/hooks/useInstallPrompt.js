// resources/js/offline/hooks/useInstallPrompt.js
// -----------------------------------------------------------------------------
// Hook que captura o evento `beforeinstallprompt` (Android/desktop Chrome/Edge)
// e expõe uma função install() que dispara o prompt nativo.
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';

export default function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        // Detecta se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true) {
            setInstalled(true);
            return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const installedHandler = () => {
            setInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', installedHandler);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, []);

    const install = useCallback(async () => {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return outcome === 'accepted';
    }, [deferredPrompt]);

    return {
        canInstall: !!deferredPrompt && !installed,
        installed,
        install,
    };
}
