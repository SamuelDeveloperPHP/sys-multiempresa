import React from 'react';
import { usePage } from '@inertiajs/react';

export default function VisaoGeral({ funcionario }) {
    // Tratamento de datas (Simples formatador local)
    const formatDate = (dateString) => {
        if (!dateString) return 'Não informado';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR').format(date);
    };

    return (
        <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Coluna 1: Informações Pessoais */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                Informações Pessoais
                            </h3>
                        </div>
                        <div className="p-5">
                            <dl className="divide-y divide-gray-100">
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Matrícula</dt>
                                    <dd className="text-sm font-semibold text-gray-900">{funcionario.matricula || '-'}</dd>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">CPF</dt>
                                    <dd className="text-sm font-semibold text-gray-900">{funcionario.cpf || '-'}</dd>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">RG</dt>
                                    <dd className="text-sm font-semibold text-gray-900">{funcionario.rg || '-'}</dd>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Contato (Celular)</dt>
                                    <dd className="text-sm font-semibold text-gray-900">{funcionario.celular || '-'}</dd>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">E-mail</dt>
                                    <dd className="text-sm font-semibold text-blue-600 truncate max-w-[200px]" title={funcionario.email}>{funcionario.email || '-'}</dd>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Nascimento</dt>
                                    <dd className="text-sm font-semibold text-gray-900">{formatDate(funcionario.data_nascimento)}</dd>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Admissão</dt>
                                    <dd className="text-sm font-semibold text-gray-900">{formatDate(funcionario.data_adminssao || funcionario.created_at)}</dd>
                                </div>
                            </dl>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Endereço Residencial</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {funcionario.endereco ? (
                                        <>
                                            {funcionario.endereco}, {funcionario.numero || 'S/N'}<br />
                                            {funcionario.bairro && `${funcionario.bairro}, `}{funcionario.cidade} - {funcionario.estado}<br />
                                            CEP: {funcionario.cep}
                                        </>
                                    ) : (
                                        <span className="text-gray-400 italic">Endereço não cadastrado</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna 2: Qualificações e Resumo Profissional */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Placeholder para os Cards de Qualificações Obrigatórias 
                        (No futuro, quando os arrays de qualificacao_funcoes vierem do backend, iteramos aqui)
                    */}
                    <div className="border-l-4 border-amber-500 bg-white rounded-r-xl shadow-sm border border-y-gray-200 border-r-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Status das Qualificações Obrigatórias</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 md:col-span-2">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="font-medium">Nenhuma qualificação pendente ou cadastrada.</p>
                                <p className="text-sm mt-1">Os documentos obrigatórios para a função de <strong>{funcionario.funcao?.funcao || 'N/A'}</strong> aparecerão aqui.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
