// resources/js/offline/hooks/useOnlineStatus.js
// -----------------------------------------------------------------------------
// Hook reativo que indica se o browser está online.
// Observa eventos 'online'/'offline' do window. Opcionalmente, faz um ping
// periódico a um endpoint real (porque navigator.onLine é unreliable em
// captive portals e WiFi com problemas de DNS).
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { pingServer } from '../api/client';

export default function useOnlineStatus({ pingIntervalMs = 30000, pingEndpoint = true } = {}) {
    const [online, setOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [verifiedOnline, setVerifiedOnline] = useState(online);
    const [lastChecked, setLastChecked] = useState(null);

    // Verificação ativa com ping
    const verify = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setVerifiedOnline(false);
            setLastChecked(new Date());
            return false;
        }
        if (!pingEndpoint) {
            setVerifiedOnline(true);
            setLastChecked(new Date());
            return true;
        }
        const ok = await pingServer(3000);
        setVerifiedOnline(ok);
        setLastChecked(new Date());
        return ok;
    }, [pingEndpoint]);

    // Listeners nativos
    useEffect(() => {
        const handleOnline = () => {
            setOnline(true);
            verify();
        };
        const handleOffline = () => {
            setOnline(false);
            setVerifiedOnline(false);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [verify]);

    // Ping periódico
    useEffect(() => {
        if (!pingIntervalMs) return;
        // Verifica imediatamente ao montar
        verify();
        const interval = setInterval(verify, pingIntervalMs);
        return () => clearInterval(interval);
    }, [verify, pingIntervalMs]);

    return {
        online: verifiedOnline,
        navigatorOnline: online,
        lastChecked,
        verify,
    };
}
