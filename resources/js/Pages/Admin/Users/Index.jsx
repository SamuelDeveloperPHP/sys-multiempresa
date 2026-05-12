import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index({ users, companies, filters, auth }) {
    // Inicialização dos estados baseados na URL (props via Controller)
    const [searchTerm, setSearchTerm] = useState(filters?.q || '');
    const [status, setStatus] = useState(filters?.status || '');
    const [type, setType] = useState(filters?.type || '');
    const [companyId, setCompanyId] = useState(filters?.company_id || '');
    const [online, setOnline] = useState(filters?.online || '');

    // Função para aplicar filtros via Inertia puxando state local
    const applyFilters = (overrides = {}) => {
        const query = {
            q: typeof overrides.q !== 'undefined' ? overrides.q : searchTerm,
            status: typeof overrides.status !== 'undefined' ? overrides.status : status,
            type: typeof overrides.type !== 'undefined' ? overrides.type : type,
            company_id: typeof overrides.company_id !== 'undefined' ? overrides.company_id : companyId,
            online: typeof overrides.online !== 'undefined' ? overrides.online : online,
        };

        // Limpa chaves vazias
        Object.keys(query).forEach(key => {
            if (!query[key]) delete query[key];
        });

        router.get(route('admin.users.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounce manual simples para a busca (digitou -> espera 400ms -> pesquisa)
    useEffect(() => {
        if (searchTerm === (filters?.q || '')) return; // Só dispara se realmente mudou

        const delayDebounceFn = setTimeout(() => {
            applyFilters({ q: searchTerm });
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);


    const handleDelete = (user) => {
        if (confirm(`Tem certeza que deseja remover o usuário ${user.name}? Esta ação é irreversível.`)) {
            router.delete(route('admin.users.destroy', user.id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Usuários</h2>}
        >
            <Head title="Gerenciar Usuários" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header Área */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Usuários do Sistema</h1>
                        <p className="text-sm text-gray-500 mt-1">Gerencie logins, escopo de empresas e permissões modulares.</p>
                    </div>

                    <Link
                        href={route('admin.users.create')}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg text-white bg-[#00b393] hover:bg-[#008f75] transition-all transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Novo Usuário
                    </Link>
                </div>

                {/* Card de Listagem */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                    
                    {/* Filtros Container */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            {/* Buscar Título */}
                            <div className="md:col-span-2 relative">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Pesquisar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Busque por nome ou e-mail..."
                                        className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm transition-colors"
                                    />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Filtro: Tipo */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                                <select
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value);
                                        applyFilters({ type: e.target.value });
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm transition-colors"
                                >
                                    <option value="">Todos</option>
                                    <option value="user">Usuário Padrão</option>
                                    <option value="admin">Administrador</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>

                            {/* Filtro: Status */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Status de Conta</label>
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
                                    <option value="inactive">Bloqueados</option>
                                </select>
                            </div>

                            {/* Filtro: Empresa */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Vínculo de Empresa</label>
                                <select
                                    value={companyId}
                                    onChange={(e) => {
                                        setCompanyId(e.target.value);
                                        applyFilters({ company_id: e.target.value });
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00b393] focus:ring-[#00b393] sm:text-sm transition-colors"
                                >
                                    <option value="">Todas</option>
                                    {companies?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Resultados */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"># ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Perfil & Contato</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Credencial</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Atuação (Empresas)</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                Nenhum usuário localizado na base.
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map(user => (
                                        <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-400">
                                                {user.id.toString().padStart(4, '0')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-full object-cover shadow-sm" src={user.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ebf4ff&color=4299e1`} alt="" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.type === 'super_admin' && <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-purple-100 text-purple-800 border border-purple-200">Super Admin</span>}
                                                {user.type === 'admin' && <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-100 text-blue-800 border border-blue-200">Administrador</span>}
                                                {user.type === 'user' && <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-gray-100 text-gray-800 border border-gray-200">Usuário Padrão</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {user.companies?.length === 0 ? (
                                                        <span className="text-xs text-gray-400">Desvinculado</span>
                                                    ) : (
                                                        user.companies?.map(c => (
                                                            <span key={c.id} className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600 truncate max-w-full" title={c.name}>
                                                                {c.name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {user.is_active ? 'Conta Ativa' : 'Bloqueado'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex border rounded-lg overflow-hidden shadow-sm shadow-[#00b393]/5 w-fit ml-auto divide-x divide-gray-100">
                                                    <Link
                                                        href={route('admin.users.edit', user.id)}
                                                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition items-center justify-center"
                                                        title="Editar Cadastro"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => router.post(route('users.toggle-status', user.id))}
                                                        className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition items-center justify-center flex gap-1"
                                                        title={user.is_active ? "Bloquear Acesso" : "Liberar Acesso"}
                                                    >
                                                        {user.is_active ? (
                                                            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                        ) : (
                                                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition items-center justify-center"
                                                        title="Remover Conta"
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

                    {/* Paginação */}
                    {users.links && users.links.length > 3 && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Exibindo do <span className="font-bold text-gray-900">{users.from}</span> ao <span className="font-bold text-gray-900">{users.to}</span> num total de <span className="font-bold text-gray-900">{users.total}</span> registros
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        {users.links.map((link, k) => (
                                            <Link
                                                key={k}
                                                href={link.url || '#'}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`
                                                    relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                                    ${link.active ? 'z-10 bg-[#f0f9f8] border-[#00b393] text-[#00b393] font-bold' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}
                                                    ${!link.url ? 'opacity-50 cursor-not-allowed hidden md:inline-flex' : ''}
                                                    ${k === 0 ? 'rounded-l-md' : ''}
                                                    ${k === users.links.length - 1 ? 'rounded-r-md' : ''}
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
