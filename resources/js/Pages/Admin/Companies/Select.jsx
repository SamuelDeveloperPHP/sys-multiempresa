import { Head, usePage, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Select({ companies }) {
    const { flash } = usePage().props;
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [processing, setProcessing] = useState(false);

    const handleSelectEnvironment = (companyId, obraId = null) => {
        setProcessing(true);
        router.post(route('companies.set'), {
            company_id: companyId,
            obra_id: obraId
        }, {
            onFinish: () => setProcessing(false)
        });
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-start py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-gray-900">
            <Head title="Selecione um Ambiente" />
            
            <div className="w-[95%] sm:w-[90%] max-w-screen-2xl mx-auto">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto rounded-xl shadow-lg bg-gradient-to-tr from-[#557bbb] to-teal-400 flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Ambiente de Trabalho
                    </h2>
                    <p className="mt-2 text-md text-gray-600">
                        Selecione a empresa e a obra para acessar o painel correspondente.
                    </p>
                </div>

                {flash.message && (
                    <div className="mb-6 bg-[#eef2f9] border border-[#bccae7] text-[#3a5a8c] px-4 py-3 rounded-xl text-sm font-medium shadow-sm max-w-lg mx-auto text-center">
                        {flash.message}
                    </div>
                )}

                {companies.length > 0 ? (
                    <div className="space-y-6">
                        {companies.map(company => {
                            const isSelected = selectedCompanyId === company.id;
                            
                            return (
                                <div key={company.id} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isSelected ? 'border-[#557bbb] ring-1 ring-[#557bbb]' : 'border-gray-200 hover:border-[#557bbb] hover:shadow-md'}`}>
                                    
                                    {/* Cabeçalho do Card (Empresa) */}
                                    <div 
                                        className={`p-5 flex items-center justify-between cursor-pointer ${isSelected ? 'bg-[#eef2f9]/50' : 'bg-white'}`}
                                        onClick={() => setSelectedCompanyId(isSelected ? null : company.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 flex-shrink-0 border border-gray-200">
                                                {company.logo_path ? (
                                                    <img src={`/storage/${company.logo_path}`} alt={company.name} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <span className="text-xl font-bold">{company.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
                                                <p className="text-sm text-gray-500">CNPJ: {company.cnpj || 'Não informado'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                                {company.obras?.length || 0} Obras
                                            </span>
                                            <div className={`p-2 rounded-full transition-colors ${isSelected ? 'bg-[#557bbb] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                <svg className={`w-5 h-5 transition-transform duration-300 ${isSelected ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conteúdo Expandido (Obras) */}
                                    {isSelected && (
                                        <div className="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in-up">
                                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#557bbb]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Selecione o local de trabalho
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                {/* Matriz / Geral */}
                                                <button
                                                    onClick={() => handleSelectEnvironment(company.id, null)}
                                                    disabled={processing}
                                                    className="text-left bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-[#557bbb] hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-[#557bbb]"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-[#557bbb] group-hover:text-white transition-colors">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                        </div>
                                                        <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Geral</span>
                                                    </div>
                                                    <h5 className="font-bold text-gray-900 group-hover:text-[#557bbb] transition-colors">Matriz (Visão Geral)</h5>
                                                    <p className="text-xs text-gray-500 mt-1">Acessar dados consolidados da empresa inteira.</p>
                                                </button>

                                                {/* Lista de Obras */}
                                                {company.obras && company.obras.map(obra => (
                                                    <button
                                                        key={obra.id}
                                                        onClick={() => handleSelectEnvironment(company.id, obra.id)}
                                                        disabled={processing}
                                                        className="text-left bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-[#557bbb] hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-[#557bbb]"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-[#557bbb] group-hover:text-white transition-colors">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                            </div>
                                                            <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Obra</span>
                                                        </div>
                                                        <h5 className="font-bold text-gray-900 group-hover:text-[#557bbb] transition-colors line-clamp-1" title={obra.nome_fantasia}>
                                                            {obra.nome_fantasia}
                                                        </h5>
                                                        <p className="text-xs text-gray-500 mt-1">Código: {obra.code || 'N/A'}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {/* Option to create a new one */}
                        <div className="text-center pt-8">
                            <span className="text-sm text-gray-500">Ou deseja </span>
                            <Link href={route('companies.setup.create')} className="text-sm font-bold text-[#557bbb] hover:underline">
                                cadastrar nova construtora?
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum ambiente encontrado</h3>
                        <p className="text-md text-gray-600 max-w-md mx-auto mb-8">
                            Você ainda não possui nenhuma empresa ou obra vinculada ao seu usuário para acessar o sistema.
                        </p>
                        <Link 
                            href={route('companies.setup.create')} 
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-[#557bbb] hover:bg-[#009b80] transition-colors"
                        >
                            Criar Minha Primeira Empresa
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
