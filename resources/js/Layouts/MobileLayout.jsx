// resources/js/Layouts/MobileLayout.jsx
// -----------------------------------------------------------------------------
// Layout mobile-first usado em /mobile/*. Diferente do AuthenticatedLayout
// (desktop com sidebar fixa), este é otimizado para telas pequenas:
//   - Header compacto com voltar + título + indicador online + botão sync
//   - Bottom nav opcional para módulos principais
//   - Sem sidebar — navegação via cards/links nas pages
// -----------------------------------------------------------------------------

import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import OnlineIndicator from '@/Components/Mobile/OnlineIndicator';
import SyncButton from '@/Components/Mobile/SyncButton';
import InstallPrompt from '@/Components/Mobile/InstallPrompt';
import useSyncStatus from '@/offline/hooks/useSyncStatus';
import { warmupMobileCache } from '@/offline/warmupCache';

export default function MobileLayout({ header, backUrl, children, hideBottomNav = false }) {
    const { auth } = usePage().props;
    const { user } = auth || {};
    const [menuOpen, setMenuOpen] = useState(false);

    // Pre-warm do cache de navegação: quando o usuário abre qualquer página
    // mobile estando online, disparamos fetch em background das outras rotas
    // principais para que o Service Worker as cacheie. Assim, se entrar em
    // modo avião depois, todas funcionam offline.
    // Throttled internamente (5 min) e silencioso em caso de erro.
    useEffect(() => {
        warmupMobileCache().catch(() => { /* silent */ });
    }, []);

    const handleBack = () => {
        if (backUrl) {
            router.visit(backUrl);
        } else if (window.history.length > 1) {
            window.history.back();
        } else {
            router.visit('/mobile/veiculos');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* ============= HEADER ============= */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 px-3 h-14">
                    <button
                        onClick={handleBack}
                        className="w-9 h-9 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                        title="Voltar"
                    >
                        <i className="fa-solid fa-arrow-left" />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-[15px] font-semibold text-gray-800 truncate">
                            {typeof header === 'string' ? header : header || 'SGA Mobile'}
                        </h1>
                    </div>

                    <OnlineIndicator compact />
                    <SyncButton compact />

                    <button
                        onClick={() => setMenuOpen(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                        title="Menu"
                    >
                        <i className="fa-solid fa-bars" />
                    </button>
                </div>
            </header>

            {/* ============= MAIN ============= */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* ============= BOTTOM NAV ============= */}
            {!hideBottomNav && <BottomNav onMenuClick={() => setMenuOpen(true)} />}

            {/* ============= DRAWER LATERAL ============= */}
            {menuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-50"
                        onClick={() => setMenuOpen(false)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                            <img
                                src={
                                    user?.profile_photo_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=557bbb&color=fff&bold=true`
                                }
                                alt={user?.name || 'Usuário'}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-800 truncate">{user?.name || 'Usuário'}</p>
                                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="p-3">
                            <SyncButton />
                        </div>

                        <nav className="flex-1 overflow-y-auto px-2 py-2">
                            <DrawerLink href="/mobile/veiculos" icon="fa-truck-front" label="Veículos" />
                            <DrawerLink href="/mobile/abastecimentos" icon="fa-gas-pump" label="Abastecimentos" />
                            <DrawerLink href="/mobile/diario-bordo" icon="fa-book" label="Diário de Bordo" />
                            <DrawerLink href="/mobile/checklists" icon="fa-clipboard-check" label="Checklists" />
                            <DrawerLink href="/mobile/locacoes" icon="fa-handshake" label="Locações" />
                            <div className="border-t border-gray-200 my-2" />
                            <DrawerLink href="/dashboard" icon="fa-desktop" label="Versão Desktop" />
                            <DrawerLink
                                href="/logout"
                                icon="fa-right-from-bracket"
                                label="Sair"
                                method="post"
                                className="text-red-600"
                            />
                        </nav>

                        <div className="p-3 border-t border-gray-200 text-[10px] text-gray-400 text-center">
                            SGA-Engeativos {new Date().getFullYear()}
                        </div>
                    </div>
                </>
            )}

            <InstallPrompt />
        </div>
    );
}

function BottomNavLink({ href, icon, label }) {
    const current = typeof window !== 'undefined' && window.location.pathname.startsWith(href);
    return (
        <Link
            href={href}
            className={`flex flex-col items-center gap-0.5 py-2 ${
                current ? 'text-[#557bbb]' : 'text-gray-500'
            }`}
        >
            <i className={`fa-solid ${icon} text-[16px]`} />
            <span className="text-[10px] font-medium">{label}</span>
        </Link>
    );
}

function BottomNavAction({ onClick, icon, label, color = 'text-gray-500', badge }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-0.5 py-2 relative ${color}`}>
            <i className={`fa-solid ${icon} text-[16px]`} />
            <span className="text-[10px] font-medium">{label}</span>
            {badge > 0 && (
                <span className="absolute top-1 right-1/4 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    );
}

function BottomNav({ onMenuClick }) {
    const { pendingCount } = useSyncStatus();
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
            <div className="grid grid-cols-5 max-w-md mx-auto">
                <BottomNavLink href="/mobile/veiculos"        icon="fa-truck-front"    label="Veículos" />
                <BottomNavLink href="/mobile/abastecimentos"  icon="fa-gas-pump"       label="Abastec." />
                <BottomNavLink href="/mobile/diario-bordo"    icon="fa-book"           label="Diário" />
                <BottomNavLink href="/mobile/checklists"      icon="fa-clipboard-check" label="Checklist" />
                <BottomNavAction
                    onClick={onMenuClick}
                    icon="fa-bars"
                    label="Menu"
                    color={pendingCount > 0 ? 'text-amber-600' : 'text-gray-500'}
                    badge={pendingCount}
                />
            </div>
        </nav>
    );
}

function DrawerLink({ href, icon, label, method, className = '' }) {
    return (
        <Link
            href={href}
            method={method}
            as={method ? 'button' : 'a'}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 text-sm text-gray-700 w-full text-left ${className}`}
        >
            <i className={`fa-solid ${icon} w-5 text-center text-gray-400`} />
            <span>{label}</span>
        </Link>
    );
}
