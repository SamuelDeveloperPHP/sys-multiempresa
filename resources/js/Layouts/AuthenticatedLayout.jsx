import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const { user, company, menuSections } = auth || {};
    const [openSections, setOpenSections] = useState({});

    // Optional: open sections that have the active route (naive approach matching substring)
    useEffect(() => {
        if (menuSections) {
            const currentPath = window.location.pathname;
            const initials = {};
            menuSections.forEach(section => {
                if (section.items && section.items.some(i => route(i.route_name).includes(currentPath) || currentPath.includes(route(i.route_name).replace(window.location.origin, '')))) {
                     initials[section.label] = true;
                }
            });
            setOpenSections(initials);
        }
    }, [menuSections]);

    const toggleSection = (label) => {
        setOpenSections(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    return (
        <div className="min-h-screen flex font-sans antialiased bg-gray-100">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r flex flex-col">
                <div className="h-16 flex items-center px-4 border-b border-gray-100">
                    <div className="flex items-center justify-center justify-items-center gap-2 w-full">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-teal-400"></div>
                        <span className="text-[22px] font-extrabold text-[#00b393] tracking-tighter">SGA<span className="text-gray-700">-Engeativos</span></span>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 text-sm overflow-y-auto">
                    <Link href="/dashboard"
                          className={`block mb-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${window.location.pathname === '/dashboard' ? 'bg-[#f0f9f8] text-[#00b393] font-medium shadow-sm border border-[#e1f5f2]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}`}>
                        Dashboard
                    </Link>

                    {menuSections?.map((section, index) => {
                        const isOpen = openSections[section.label];
                        return (
                            <div key={index} className="mt-3">
                                <button type="button"
                                        onClick={() => toggleSection(section.label)}
                                        className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:text-[#00b393]">
                                    <span className="flex items-center">
                                        {section.icon && <i className={`${section.icon} mr-2 text-[12px]`}></i>}
                                        {section.label}
                                    </span>
                                    <span className={`ml-2 h-4 w-4 flex items-center justify-center transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-90 text-[#00b393]' : 'text-gray-400'}`}>
                                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L10.586 10 7.293 6.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </button>

                        {section.items && (
                                    <ul className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        {section.items.map((item, i) => {
                                            const itemRoute = route().has(item.route_name) ? route(item.route_name) : '#';
                                            const isActive = window.location.href.includes(itemRoute) && itemRoute !== '#';
                                            return (
                                                <li key={i}>
                                                    <Link href={itemRoute}
                                                        className={`flex items-center pl-4 pr-3 py-1.5 rounded text-[13px] transition-colors ${isActive ? 'bg-[#f0f9f8] text-[#00b393] border-l-4 border-[#00b393] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'}`}>
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
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        {typeof header === 'string' ? (
                            <h2 className="font-semibold text-lg md:text-xl text-gray-800 leading-tight">
                                {header}
                            </h2>
                        ) : (
                            <h2 className="font-semibold text-lg md:text-xl text-gray-800 leading-tight">
                                {header || 'Dashboard'}
                            </h2>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-xs relative">
                        {company ? (
                            <div className="flex items-center">
                                <span className="text-gray-400 mr-2">Empresa:</span>
                                <span className="px-3 py-1 rounded-full bg-[#f0f9f8] text-[#00b393] font-medium border border-[#c1ede5]">
                                    {company.name}
                                </span>
                                <Link href={route('companies.select')} className="text-[#6690f4] text-xs font-semibold ml-2 hover:underline">
                                    trocar
                                </Link>
                            </div>
                        ) : (
                            <Link href={route('companies.select')} className="text-red-600 text-xs font-semibold hover:underline">
                                Nenhuma empresa selecionada
                            </Link>
                        )}

                        <div className="h-6 w-px bg-gray-200"></div>

                        {/* Profile Dropdown */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none" title="Opções da Conta">
                                <span className="font-medium text-gray-700 text-xs text-right leading-tight hidden lg:block">
                                    <span className="block">{user?.name}</span>
                                    <span className="text-gray-500 font-normal">{user?.type || 'Usuário'}</span>
                                </span>
                                <img 
                                    src={user?.profile_photo_url || `https://ui-avatars.com/api/?name=${user?.name}&color=008f75&background=f0f9f8`} 
                                    alt={user?.name} 
                                    className="h-9 w-9 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                                <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu Container */}
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <Link href={route('profile.edit')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#00b393]">
                                    <i className="fa-solid fa-user-circle mr-2 text-gray-400"></i> Meu Perfil
                                </Link>
                                <Link href="/logout" method="post" as="button" className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                    <i className="fa-solid fa-sign-out-alt mr-2"></i> Sair do Sistema
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {children}
                </main>

                <footer className="border-t bg-white px-6 py-3 text-[11px] text-gray-500 flex justify-between items-center shadow-inner">
                    <span className="font-medium text-gray-600">Sys-Multiempresa &copy; {new Date().getFullYear()}</span>
                    <span className="text-gray-400">{user?.email}</span>
                </footer>
            </div>
        </div>
    );
}
