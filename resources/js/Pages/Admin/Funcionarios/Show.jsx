import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VisaoGeral from './Partials/VisaoGeral';
import DadosAcesso from './Partials/DadosAcesso';
import DocsObrigatorios from './Partials/DocsObrigatorios';
import DocsGerais from './Partials/DocsGerais';
import RetiradasEstoque from './Partials/RetiradasEstoque';
import BiometriaDigital from './Partials/BiometriaDigital';

export default function Show({ funcionario, linkedUser, auth }) {
    const [activeTab, setActiveTab] = useState('visao_geral');

    // Mapeamento dos Tabs
    const tabs = [
        { id: 'visao_geral', label: 'Visão Geral', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
        { id: 'docs_obrigatorios', label: 'Doc\'s Obrigatórios', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'docs_gerais', label: 'Doc\'s Gerais', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' },
        { id: 'dados_acesso', label: 'Acesso ao Sistema', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
        { id: 'retiradas', label: 'Estoque / Ferramentas', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
        { id: 'biometria', label: 'Biometria', icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 5.602a23.99 23.99 0 01-2.146 4.062m3.348-7.602a23.943 23.943 0 01-.978 5M9.5 8.5l1.5 1.5L14 7' },
    ];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Detalhes do Funcionário</h2>}
        >
            <Head title={`Funcionário - ${funcionario.nome}`} />

            {/* Cabeçalho de Perfil Turbinado */}
            <div className="bg-[#003f5c] text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <img
                                    src={funcionario.imagem_usuario ? `/storage/users/${funcionario.id}/${funcionario.imagem_usuario}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(funcionario.nome)}&background=00b393&color=fff&size=128`}
                                    alt={funcionario.nome}
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl object-cover"
                                />
                                <span className={`absolute bottom-2 right-2 w-5 h-5 border-2 border-white rounded-full ${funcionario.status === 'Ativo' ? 'bg-rise-500' : 'bg-rose-500'}`}></span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight mb-1">{funcionario.nome}</h1>
                                <p className="text-blue-100 font-medium text-lg mb-1">{funcionario.funcao?.funcao || 'Sem função registrada'}</p>
                                <div className="flex items-center gap-4 text-sm text-blue-200">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                        Matrícula: {funcionario.matricula || 'N/A'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        {funcionario.obra?.nome || 'Matriz'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href={`/admin/funcionarios/downloads_zip/${funcionario.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-md transition-all"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Baixar ZIP
                            </a>
                            <Link
                                href={route('admin.funcionarios.edit', funcionario.id)}
                                className="inline-flex items-center justify-center px-4 py-2 bg-[#557bbb] hover:bg-[#3a5a8c] text-white text-sm font-bold rounded-lg shadow-md transition-all"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Editar Cadastro
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                {/* Abas */}
                <div className="bg-white rounded-t-xl shadow-sm border-b border-gray-200">
                    <nav className="flex overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap flex items-center gap-2 py-4 px-6 border-b-2 font-semibold text-sm transition-colors min-w-max
                                    ${activeTab === tab.id 
                                        ? 'border-[#557bbb] text-[#557bbb] bg-[#eef2f9]' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                                </svg>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Conteúdo Dinâmico */}
                <div className="bg-white rounded-b-xl shadow-sm p-6 min-h-[50vh]">
                    {activeTab === 'visao_geral' && <VisaoGeral funcionario={funcionario} />}
                    {activeTab === 'docs_obrigatorios' && <DocsObrigatorios funcionario={funcionario} />}
                    {activeTab === 'docs_gerais' && <DocsGerais funcionario={funcionario} />}
                    {activeTab === 'dados_acesso' && <DadosAcesso funcionario={funcionario} linkedUser={linkedUser} />}
                    {activeTab === 'retiradas' && <RetiradasEstoque funcionario={funcionario} />}
                    {activeTab === 'biometria' && <BiometriaDigital funcionario={funcionario} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
