import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

/**
 * Layout inspirado no Rise CRM (CodeCanyon).
 * Sidebar BRANCA com active azul claro + indicador esquerdo,
 * topbar branca fina, accent azul #557bbb.
 */
export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const { user, company, menuSections } = auth || {};
    const [openSections, setOpenSections] = useState({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (menuSections) {
            const currentPath = window.location.pathname;
            const initials = {};
            menuSections.forEach((section) => {
                if (
                    section.items &&
                    section.items.some(
                        (i) =>
                            route(i.route_name).includes(currentPath) ||
                            currentPath.includes(route(i.route_name).replace(window.location.origin, ''))
                    )
                ) {
                    initials[section.label] = true;
                }
            });
            setOpenSections(initials);
        }
    }, [menuSections]);

    const toggleSection = (label) =>
        setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

    const isDashboardActive = window.location.pathname === '/dashboard';

    return (
        <div className="h-screen flex font-sans antialiased bg-gray-50 text-[14px] overflow-hidden">
            {/* ================= SIDEBAR (BRANCA estilo Rise) ================= */}
            <aside
                className={`${sidebarCollapsed ? 'w-16' : 'w-60'} bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full transition-all duration-200`}
            >
                {/* Brand */}
                <div className="h-16 flex items-center px-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 w-full">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1abc9c] to-[#00BCD4] flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                            S
                        </div>
                        {!sidebarCollapsed && (
                            <span className="text-[20px] font-extrabold tracking-tight text-gray-800">
                                SGA<span className="text-[#1abc9c]">·Eng</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Menu scroll */}
                <nav className="flex-1 px-2 py-3 overflow-y-auto custom-sidebar-scroll">
                    {/* Dashboard */}
                    <Link
                        href="/dashboard"
                        title={sidebarCollapsed ? 'Dashboard' : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors border-l-[3px] ${
                            isDashboardActive
                                ? 'bg-[#e8f0fe] text-[#1d4ed8] border-[#557bbb] font-semibold'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                        }`}
                    >
                        <i className={`fa-solid fa-gauge-high text-[15px] w-4 text-center ${isDashboardActive ? 'text-[#1d4ed8]' : 'text-gray-500'}`} />
                        {!sidebarCollapsed && <span className="text-[13.5px]">Dashboard</span>}
                    </Link>

                    {menuSections?.map((section, index) => {
                        const isOpen = openSections[section.label];
                        const hasActiveChild = section.items?.some((i) => {
                            const r = route().has(i.route_name) ? route(i.route_name) : '';
                            return r && window.location.href.includes(r);
                        });
                        return (
                            <div key={index} className="mt-1">
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section.label)}
                                    title={sidebarCollapsed ? section.label : undefined}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors border-l-[3px] ${
                                        hasActiveChild
                                            ? 'bg-[#e8f0fe] text-[#1d4ed8] border-[#557bbb] font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                                    }`}
                                >
                                    <span className="flex items-center gap-3">
                                        {section.icon && (
                                            <i className={`${section.icon} text-[15px] w-4 text-center ${hasActiveChild ? 'text-[#1d4ed8]' : 'text-gray-500'}`}></i>
                                        )}
                                        {!sidebarCollapsed && (
                                            <span className="text-[13.5px]">{section.label}</span>
                                        )}
                                    </span>
                                    {!sidebarCollapsed && section.items?.length > 0 && (
                                        <i
                                            className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform ${
                                                isOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    )}
                                </button>

                                {section.items && !sidebarCollapsed && (
                                    <ul
                                        className={`overflow-hidden transition-all duration-200 ${
                                            isOpen ? 'max-h-[800px] mt-0.5' : 'max-h-0'
                                        }`}
                                    >
                                        {section.items.map((item, i) => {
                                            const itemRoute = route().has(item.route_name)
                                                ? route(item.route_name)
                                                : '#';
                                            const isActive =
                                                itemRoute !== '#' &&
                                                window.location.href.includes(itemRoute);
                                            return (
                                                <li key={i}>
                                                    <Link
                                                        href={itemRoute}
                                                        className={`flex items-center gap-2.5 pl-10 pr-3 py-2 text-[13px] rounded transition-colors border-l-[3px] ${
                                                            isActive
                                                                ? 'bg-[#f0f4fa] text-[#1d4ed8] border-[#557bbb] font-medium'
                                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                                                        }`}
                                                    >
                                                        {item.icon ? (
                                                            <i className={`${item.icon} text-[12px] w-4 text-center ${isActive ? 'text-[#1d4ed8]' : 'text-gray-400'}`} />
                                                        ) : (
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#1d4ed8]' : 'bg-gray-400'}`} />
                                                        )}
                                                        {item.label}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Sidebar footer com toggle de colapso */}
                <div className="border-t border-gray-200 p-2">
                    <button
                        onClick={() => setSidebarCollapsed((c) => !c)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors text-[12px]"
                        title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        <i className={`fa-solid ${sidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
                        {!sidebarCollapsed && <span>Recolher</span>}
                    </button>
                </div>
            </aside>

            {/* ================= MAIN ================= */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Topbar */}
                <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm flex-shrink-0 z-30">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <h2 className="font-semibold text-[15px] text-gray-700 truncate">
                            {typeof header === 'string' ? header : header || 'Painel'}
                        </h2>

                        <div className="hidden lg:block flex-1 max-w-md">
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]" />
                                <input
                                    type="search"
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:bg-white focus:border-[#557bbb] focus:ring-1 focus:ring-[#557bbb]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        {company ? (
                            <div className="hidden md:flex items-center gap-2 text-[12px]">
                                <span className="text-gray-400">Empresa:</span>
                                <span className="px-2.5 py-1 rounded-md bg-[#557bbb]/10 text-[#3a5a8c] font-medium border border-[#557bbb]/20">
                                    {company.name}
                                </span>
                                <Link
                                    href={route('companies.select')}
                                    className="text-[#557bbb] text-[11px] font-semibold hover:underline"
                                >
                                    trocar
                                </Link>
                            </div>
                        ) : (
                            <Link
                                href={route('companies.select')}
                                className="text-red-600 text-[12px] font-semibold hover:underline"
                            >
                                ⚠ Nenhuma empresa
                            </Link>
                        )}

                        <button className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-md transition-colors" title="Notificações">
                            <i className="fa-regular fa-bell text-[15px]" />
                        </button>

                        <div className="h-6 w-px bg-gray-200 hidden md:block" />

                        <div className="relative group">
                            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none" title="Conta">
                                <img
                                    src={
                                        user?.profile_photo_url ||
                                        `https://ui-avatars.com/api/?name=${user?.name}&color=fff&background=557bbb&bold=true`
                                    }
                                    alt={user?.name}
                                    className="h-8 w-8 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                                <span className="hidden lg:block text-right leading-tight text-[12px]">
                                    <span className="block font-medium text-gray-800">{user?.name}</span>
                                    <span className="text-gray-500">{user?.type || 'Usuário'}</span>
                                </span>
                                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 hidden lg:inline-block" />
                            </button>

                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <Link
                                    href={route('profile.edit')}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <i className="fa-solid fa-user-circle mr-2 text-gray-400" /> Meu Perfil
                                </Link>
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                                >
                                    <i className="fa-solid fa-right-from-bracket mr-2" /> Sair
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>

                <footer className="border-t bg-white px-6 py-2 text-[11px] text-gray-500 flex justify-between items-center flex-shrink-0">
                    <span>SGA-Engeativos &copy; {new Date().getFullYear()}</span>
                    <span className="text-gray-400">{user?.email}</span>
                </footer>
            </div>

            <style>{`
                .custom-sidebar-scroll::-webkit-scrollbar { width: 6px; }
                .custom-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
                .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
