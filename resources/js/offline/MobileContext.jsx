import { createContext, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { allowsPage, permissionKey } from './modulePermissions';
import { getMeta, setMeta, selectOfflineDatabase } from './db';
import { getOfflineSession, startOfflineSession } from './offlineAuth';

export const GrantedModules = createContext([]);

// Este layout envolve a página inteira, inclusive os hooks que consultam Dexie.
export default function MobileContext({ children }) {
    const { props: { auth }, component } = usePage();
    const user = auth?.user;
    const company = auth?.company?.id;
    const scope = user?.id && company ? user.id + ':' + company : null;
    const [verified, setVerified] = useState(null);
    const [grants, setGrants] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let mounted = true;
        let refreshId = 0;
        async function verify() {
            const id = ++refreshId;
            if (!scope) throw new Error('Empresa ausente.');
            let response;
            try {
                response = await fetch('/api/mobile/permissions', {
                    credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
                    signal: AbortSignal.timeout(8000),
                });
            } catch {
                const session = await getOfflineSession();
                if (!session || session.user_id + ':' + session.company_id !== scope) {
                    throw new Error('Sessão offline incompatível.');
                }
            }
            if (!mounted || id !== refreshId) return;
            await selectOfflineDatabase(scope);
            if (response) {
                if (!response.ok || response.headers.get('X-Mobile-Context') !== scope) {
                    await setMeta(permissionKey, []);
                    throw new Error('Sessão alterada.');
                }
                const permissions = await response.json();
                if (!mounted || id !== refreshId) return;
                if (!Array.isArray(permissions)) throw new Error('Permissões inválidas.');
                await setMeta(permissionKey, permissions);
                await startOfflineSession(user, company);
                localStorage.setItem('sga_mobile_context', scope);
            }
            const permissions = await getMeta(permissionKey);
            if (mounted && id === refreshId) {
                setGrants(permissions);
                setVerified(scope);
                setFailed(false);
            }
        }
        const refresh = () => verify().catch(() => { if (mounted) setFailed(true); });
        refresh();
        window.addEventListener('online', refresh);
        window.addEventListener('focus', refresh);
        const switched = event => {
            if (event.key === 'sga_mobile_context' && event.newValue !== scope) {
                mounted = false;
                setFailed(true);
            }
        };
        window.addEventListener('storage', switched);
        return () => { mounted = false; window.removeEventListener('storage', switched); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
    }, [scope, component]);

    if (!scope || failed) return <main className="p-6">Sessão ou empresa alterada. <a href="/login">Entrar novamente</a></main>;
    if (verified !== scope) return <main className="p-6">Verificando a sessão e a empresa…</main>;
    if (!allowsPage(grants, component)) return <main className="p-6">Acesso sem permissão para esta operação na empresa.</main>;
    return <GrantedModules.Provider value={grants}>{children}</GrantedModules.Provider>;
}
