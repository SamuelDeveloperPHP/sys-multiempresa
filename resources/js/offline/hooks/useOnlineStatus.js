// resources/js/offline/hooks/useOnlineStatus.js
// -----------------------------------------------------------------------------
// Hook reativo de status de conexão. Combina três sinais:
//
//   1) navigator.onLine                — detecta modo avião / cabo desconectado
//   2) ping HTTP em /health/ping       — detecta WiFi conectado mas sem internet
//                                        (DNS quebrado, captive portal, sinal
//                                        péssimo, etc.)
//   3) forcedOffline (manual)          — usuário pode forçar OFFLINE pelo banner
//                                        para economizar bateria/dados ou quando
//                                        sabe que a rede está instável.
//
// O sinal "online" exposto é: !forcedOffline && navigatorOnline && pingOk
//
// Persistência:
//   - Modo forçado fica em localStorage 'sga_forced_offline' = '1' | '0'
//   - State é compartilhado entre instâncias do hook via subscriber pattern
//     (evita pings duplicados quando vários componentes usam o hook).
//
// Inspirado no legado: src/contexts/network.js (NetInfo + forceOfflineMode).
// -----------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { pingServer } from '../api/client';

const STORAGE_KEY = 'sga_forced_offline';
const DEFAULT_INTERVAL = 15000; // 15s — balanço entre reatividade e bateria
const FAST_RECHECK = 2000;      // após evento online/offline, reverifica logo

// ============================================================================
// State global (singleton) — todos os hooks usam o mesmo estado e ping
// ============================================================================
const state = {
    navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pingOk: true,
    lastChecked: null,
    forcedOffline: readForcedFromStorage(),
    initialized: false,
};
const subscribers = new Set();

function readForcedFromStorage() {
    if (typeof localStorage === 'undefined') return false;
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
}

function writeForcedToStorage(value) {
    if (typeof localStorage === 'undefined') return;
    try {
        if (value) localStorage.setItem(STORAGE_KEY, '1');
        else localStorage.removeItem(STORAGE_KEY);
    } catch (_) { /* quota / privacy */ }
}

function snapshot() {
    const navOnline = state.navigatorOnline;
    const pingOk = state.pingOk;
    const forced = state.forcedOffline;
    return {
        navigatorOnline: navOnline,
        pingOk,
        forcedOffline: forced,
        // Verificação final exposta ao app:
        online: !forced && navOnline && pingOk,
        // True quando o dispositivo está realmente sem internet (modo avião OU
        // ping falhou). Útil para distinguir "forçado manual" de "real offline".
        deviceOffline: !navOnline || !pingOk,
        lastChecked: state.lastChecked,
    };
}

function notify() {
    const snap = snapshot();
    subscribers.forEach((fn) => {
        try { fn(snap); } catch (_) { /* ignore */ }
    });
}

// ============================================================================
// Ping management — só um intervalo global, compartilhado
// ============================================================================
let pingInterval = null;
let pingInFlight = false;

async function runPing() {
    if (pingInFlight) return;
    // Se o browser já disse que está offline, nem tenta pingar (poupa rede)
    if (!state.navigatorOnline) {
        state.pingOk = false;
        state.lastChecked = new Date();
        notify();
        return;
    }
    pingInFlight = true;
    try {
        const ok = await pingServer(3000);
        const changed = state.pingOk !== ok;
        state.pingOk = ok;
        state.lastChecked = new Date();
        if (changed) notify();
    } finally {
        pingInFlight = false;
    }
}

function startPingLoop() {
    if (pingInterval) return;
    runPing(); // imediato no startup
    pingInterval = setInterval(runPing, DEFAULT_INTERVAL);
}

function stopPingLoop() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
}

// ============================================================================
// Listeners do navegador (uma vez só, no módulo)
// ============================================================================
function initListeners() {
    if (state.initialized || typeof window === 'undefined') return;
    state.initialized = true;

    const onOnline = () => {
        state.navigatorOnline = true;
        // Reverifica rapidamente — pode ser que ainda não tenha rede de verdade
        setTimeout(runPing, FAST_RECHECK);
        notify();
    };
    const onOffline = () => {
        state.navigatorOnline = false;
        state.pingOk = false;
        state.lastChecked = new Date();
        notify();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Quando o tab fica visível depois de minimizado, reverifica
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) runPing();
    });

    startPingLoop();
}

// ============================================================================
// API pública chamável de qualquer lugar (sem hook)
// ============================================================================
export function getNetworkStatus() {
    return snapshot();
}

export function setForcedOffline(value) {
    const next = !!value;
    if (state.forcedOffline === next) return;
    state.forcedOffline = next;
    writeForcedToStorage(next);
    notify();
}

export function toggleForcedOffline() {
    setForcedOffline(!state.forcedOffline);
}

// ============================================================================
// React Hook
// ============================================================================
export default function useOnlineStatus(_opts = {}) {
    initListeners(); // idempotente

    const [snap, setSnap] = useState(snapshot);

    useEffect(() => {
        const cb = (s) => setSnap(s);
        subscribers.add(cb);
        // Sincroniza estado inicial (caso tenha mudado entre render e effect)
        setSnap(snapshot());
        return () => { subscribers.delete(cb); };
    }, []);

    const verify = useCallback(async () => {
        await runPing();
        return snapshot().online;
    }, []);

    return {
        // Sinal principal usado pelos componentes
        online: snap.online,
        // Sinais granulares (para UI mais rica)
        navigatorOnline: snap.navigatorOnline,
        pingOk: snap.pingOk,
        deviceOffline: snap.deviceOffline,
        forcedOffline: snap.forcedOffline,
        lastChecked: snap.lastChecked,
        // Ações
        setForcedOffline,
        toggleForcedOffline,
        verify,
    };
}
