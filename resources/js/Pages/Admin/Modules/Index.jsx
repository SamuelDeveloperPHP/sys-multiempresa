import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index({ modules, filters, auth }) {
    const [searchTerm, setSearchTerm] = useState(filters?.q || '');
    const [status, setStatus] = useState(filters?.status || '');
    const [menu, setMenu] = useState(filters?.menu || '');

    const applyFilters = (overrides = {}) => {
        const query = {
            q: typeof overrides.q !== 'undefined' ? overrides.q : searchTerm,
            status: typeof overrides.status !== 'undefined' ? overrides.status : status,
            menu: typeof overrides.menu !== 'undefined' ? overrides.menu : menu,
        };

        Object.keys(query).forEach(key => {
            if (!query[key]) delete query[key];
        });

        router.get(route('admin.modules.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        if (searchTerm === (filters?.q || '')) return;

        const delayDebounceFn = setTimeout(() => {
            applyFilters({ q: searchTerm });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleDelete = (moduleItem) => {
        if (confirm(`Tem certeza que deseja apagar o módulo "${moduleItem.name}"? Isso pode quebrar hierarquias caso hajam submódulos.`)) {
            router.delete(route('admin.modules.destroy', moduleItem.id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Módulos</h2>}
        >
            <Head title="Gerenciar Módulos" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Módulos do Sistema</h1>
                        <p className="text-sm text-gray-500 mt-1">Gerencie os nós de menu e escopos de permissões das telas.</p>
                    </div>

                    <Link
                        href={route('admin.modules.create')}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg text-white bg-[#00b393] hover:bg-[#008f75] transition-all transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Novo Módulo
                    </Link>
                </div>

                <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2 relative">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar (Nome, Rota, Slug)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Pesquise..."
                                        className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm transition-colors"
                                    />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => {
                                        setStatus(e.target.value);
                                        applyFilters({ status: e.target.value });
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm transition-colors"
                                >
                                    <option value="">Todos</option>
                                    <option value="active">Ativos</option>
                                    <option value="inactive">Inativos</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Visibilidade no Menu</label>
                                <select
                                    value={menu}
                                    onChange={(e) => {
                                        setMenu(e.target.value);
                                        applyFilters({ menu: e.target.value });
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm transition-colors"
                                >
                                    <option value="">Todos</option>
                                    <option value="show">Visíveis (Sim)</option>
                                    <option value="hide">Ocultos (Não)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"># ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Identificação</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Config. Base</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status / Visão</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {modules.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                                Nenhum módulo localizado.
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    modules.data.map(m => (
                                        <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-400">
                                                {m.id.toString().padStart(4, '0')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 shadow-sm text-[#00b393] text-xl">
                                                        <i className={m.icon || 'ri-layout-grid-line'}></i>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{m.name}</div>
                                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{m.slug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs text-gray-600"><span className="text-gray-400">Rota API:</span> {m.route_name || <span className="italic text-gray-300">n/a</span>}</div>
                                                    <div className="text-xs text-gray-600"><span className="text-gray-400">URL Amigável:</span> {m.url || <span className="italic text-gray-300">n/a</span>}</div>
                                                    {m.id_modulo_relacionamento && (
                                                        <div className="text-[10px] bg-indigo-50 text-indigo-700 mt-1 rounded px-1.5 py-0.5 w-fit border border-indigo-100 leading-none">
                                                            Pai: #{m.id_modulo_relacionamento}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full ${m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {m.is_active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full ${m.show_in_menu ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                                        {m.show_in_menu ? 'No Menu' : 'Oculto'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex border rounded-lg overflow-hidden shadow-sm shadow-[#00b393]/5 w-fit ml-auto divide-x divide-gray-100">
                                                    <Link
                                                        href={route('admin.modules.edit', m.id)}
                                                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition items-center justify-center"
                                                        title="Editar Módulo"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(m)}
                                                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition items-center justify-center"
                                                        title="Remover Módulo"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {modules.links && modules.links.length > 3 && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Exibindo de <span className="font-bold text-gray-900">{modules.from}</span> a <span className="font-bold text-gray-900">{modules.to}</span> de <span className="font-bold text-gray-900">{modules.total}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        {modules.links.map((link, k) => (
                                            <Link
                                                key={k}
                                                href={link.url || '#'}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                                    ${link.active ? 'z-10 bg-[#f0f9f8] border-[#00b393] text-[#00b393] font-bold' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}
                                                    ${!link.url ? 'opacity-50 cursor-not-allowed hidden md:inline-flex' : ''}
                                                    ${k === 0 ? 'rounded-l-md' : ''}
                                                    ${k === modules.links.length - 1 ? 'rounded-r-md' : ''}
                                                `}
                                                preserveState
                                                preserveScroll
                                            />
                                        ))}
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
