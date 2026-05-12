import { Link } from '@inertiajs/react';

export default function PortalLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#F9FAFB] flex font-sans antialiased text-gray-900">
            {/* Sidebar Clean White */}
            <nav className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="text-xl font-bold text-gray-800 tracking-tight">CRM<span className="text-blue-600">Portal</span></span>
                </div>
                <div className="flex-1 py-6 px-4 space-y-1">
                    <Link href="/portal/dashboard" className="flex items-center px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50/50 rounded-lg transition-colors">
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        Dashboard
                    </Link>
                    <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors">
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        Tickets Suporte
                    </a>
                    <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors">
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Faturas
                    </a>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 tracking-tight">Visão Geral</h2>
                    <div className="flex items-center space-x-4">
                        <Link href="/portal/logout" method="post" as="button" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Sair</Link>
                    </div>
                </header>
                <div className="p-8 flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
