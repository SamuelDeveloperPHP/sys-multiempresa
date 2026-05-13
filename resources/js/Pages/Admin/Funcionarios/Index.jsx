import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrachaModal from './Partials/CrachaModal';
import EtiquetaModal from './Partials/EtiquetaModal';

export default function Index({ funcionarios, companies, filters, auth }) {
    const [searchTerm, setSearchTerm] = useState(filters?.q || '');
    const [status, setStatus] = useState(filters?.status || '');
    const [companyId, setCompanyId] = useState(filters?.company_id || '');
    const [isCrachaModalOpen, setIsCrachaModalOpen] = useState(false);
    const [isEtiquetaModalOpen, setIsEtiquetaModalOpen] = useState(false);
    const [selectedFuncionario, setSelectedFuncionario] = useState(null);

    const applyFilters = (overrides = {}) => {
        const query = {
            q: typeof overrides.q !== 'undefined' ? overrides.q : searchTerm,
            status: typeof overrides.status !== 'undefined' ? overrides.status : status,
            company_id: typeof overrides.company_id !== 'undefined' ? overrides.company_id : companyId,
        };

        Object.keys(query).forEach(key => {
            if (!query[key]) delete query[key];
        });

        router.get(route('admin.funcionarios.index'), query, {
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

    const handleDelete = (funcionario) => {
        if (confirm(`Tem certeza que deseja remover o funcionário ${funcionario.nome}? Esta ação é irreversível.`)) {
            router.delete(route('admin.funcionarios.destroy', funcionario.id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Funcionários</h2>}
        >
            <Head title="Gerenciar Funcionários" />

            <div className="max-w-[95%] mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Cabeçalho principal */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Funcionários</h1>
                    </div>

                    <Link
                        href={route('admin.funcionarios.create')}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Novo Registro
                    </Link>
                </div>

                {/* Card de Fundo */}
                <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden p-4 sm:p-6">
                    
                    {/* Alerta OneDrive */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span className="text-sm font-medium text-amber-900">
                                Verifique a sincronização dos arquivos dos funcionários com o OneDrive
                            </span>
                        </div>
                        <Link href={route('admin.funcionarios.revisao-onedrive')} className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded shadow-sm whitespace-nowrap transition-colors flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Revisar arquivos
                        </Link>
                    </div>

                    {/* Barra de Filtros (Status + Pesquisa) */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                        {/* Status Buttons */}
                        <div className="inline-flex rounded-md shadow-sm border border-gray-200" role="group">
                            <button
                                onClick={() => { setStatus('Ativo'); applyFilters({ status: 'Ativo' }); }}
                                className={`px-4 py-2 text-sm font-medium rounded-l-md border-r border-gray-200 flex items-center gap-2 transition-colors ${status === 'Ativo' || !status ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-emerald-600 hover:bg-emerald-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m-3-3v3m6-3v3m-9-3v3m-3-3v3m-3-3v3m12-9h-9a2 2 0 00-2 2v14a2 2 0 002 2h9a2 2 0 002-2V11a2 2 0 00-2-2z" /></svg>
                                Ativos
                            </button>
                            <button
                                onClick={() => { setStatus('Inativo'); applyFilters({ status: 'Inativo' }); }}
                                className={`px-4 py-2 text-sm font-medium border-r border-gray-200 flex items-center gap-2 transition-colors ${status === 'Inativo' ? 'bg-rose-500 text-white border-rose-600' : 'bg-white text-rose-600 hover:bg-rose-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                Inativos
                            </button>
                            <button
                                onClick={() => { setStatus('Todos'); applyFilters({ status: 'Todos' }); }}
                                className={`px-4 py-2 text-sm font-medium rounded-r-md flex items-center gap-2 transition-colors ${status === 'Todos' ? 'bg-gray-600 text-white border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Todos
                            </button>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Pesquisar: Nome, CPF, matrícula..."
                                className="block w-full sm:w-80 rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                            {/* Company filter ignored here to match old screen visually, mas o backend suporta */}
                            <select 
                                className="block w-full sm:w-24 rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                                onChange={(e) => applyFilters({ per_page: e.target.value })}
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <button onClick={() => applyFilters()} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded shadow-sm transition-colors">
                                Pesquisar
                            </button>
                            <button onClick={() => { setSearchTerm(''); setStatus(''); applyFilters({ q: '', status: '' }); }} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded shadow-sm transition-colors">
                                Limpar
                            </button>
                        </div>
                    </div>

                    {/* Tabela Rica */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Funcionário</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Localização e Função</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Pendências</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {funcionarios.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                            Nenhum funcionário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    funcionarios.data.map(func => {
                                        const inativo = func.status === 'Inativo';
                                        
                                        // Mock variables that backend will provide via withCount later
                                        const contar_situacao_1 = func.qualificacoes_count || 0;
                                        const contar_doc = func.anexos_ativos_count || 0;
                                        const pendentes = Math.max(0, contar_situacao_1 - contar_doc);
                                        const qtdVencidos = func.anexos_vencidos_count || 0;

                                        return (
                                            <tr key={func.id} className={`hover:bg-gray-50 transition-colors ${inativo ? 'bg-gray-50/50' : ''}`}>
                                                
                                                {/* Funcionario Info */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${inativo ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>
                                                            {func.nome.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className={`text-sm font-bold ${inativo ? 'text-gray-400' : 'text-gray-900'}`}>{func.nome}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">Mat: {func.matricula || '--'}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Location and Function */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className={`text-sm font-semibold flex items-center gap-1.5 ${inativo ? 'text-gray-400' : 'text-gray-800'}`}>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                            {func.obra?.codigo_obra || 'Não alocado'}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                                {func.setor?.nome_setor || 'Sem setor'}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                {func.funcao?.funcao || 'Sem função'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Pendencies */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-2 items-center justify-center">
                                                        {!inativo ? (
                                                            <>
                                                                {contar_situacao_1 > 0 ? (
                                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold ${pendentes > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                        <span>{contar_situacao_1} docs</span>
                                                                        {pendentes > 0 && <span className="text-rose-500 ml-1">• faltam {pendentes}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-gray-50 border-gray-200 text-gray-500 text-xs font-bold">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                                        Sem docs exigidos
                                                                    </span>
                                                                )}

                                                                {qtdVencidos > 0 && (
                                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-rose-50 border-rose-200 text-rose-700 text-xs font-bold">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                        {qtdVencidos} vencido(s)
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                                                                INATIVO
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Ações */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            onClick={() => { setSelectedFuncionario(func); setIsCrachaModalOpen(true); }} 
                                                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded" 
                                                            title="Gerar Crachá"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => { setSelectedFuncionario(func); setIsEtiquetaModalOpen(true); }} 
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded" 
                                                            title="Imprimir Etiqueta"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                                        </button>
                                                        <Link href={route('admin.funcionarios.edit', func.id)} className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded" title="Editar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </Link>
                                                        <Link href={route('admin.funcionarios.show', func.id)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded" title="Visualizar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </Link>
                                                        <button onClick={() => handleDelete(func)} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded" title="Excluir">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {funcionarios.links && funcionarios.links.length > 3 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-gray-500 hidden sm:block">
                                Exibindo do <span className="font-bold">{funcionarios.from}</span> ao <span className="font-bold">{funcionarios.to}</span>
                            </p>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px mx-auto sm:mx-0 overflow-x-auto max-w-full">
                                {funcionarios.links.map((link, k) => (
                                    <Link
                                        key={k}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium ${link.active ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 font-bold' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                                        preserveState
                                        preserveScroll
                                    />
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>
            <CrachaModal 
                isOpen={isCrachaModalOpen} 
                onClose={() => setIsCrachaModalOpen(false)} 
                funcionario={selectedFuncionario} 
            />

            <EtiquetaModal 
                isOpen={isEtiquetaModalOpen} 
                onClose={() => setIsEtiquetaModalOpen(false)} 
                funcionario={selectedFuncionario} 
            />
        </AuthenticatedLayout>
    );
}
