import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function RevisaoOneDrive({ funcionarios, auth }) {
    const [scanProgress, setScanProgress] = useState(0);
    const [scanTotal, setScanTotal] = useState(funcionarios?.data?.length || 0);
    const [isScanning, setIsScanning] = useState(true);
    const [divergencias, setDivergencias] = useState(0);

    // Mock do Scan do OneDrive
    useEffect(() => {
        if (funcionarios?.data?.length > 0 && isScanning) {
            let current = 0;
            let divergentes = 0;
            const interval = setInterval(() => {
                current += 1;
                setScanProgress(current);

                // Simula 20% de chance de dar divergência
                if (Math.random() > 0.8) divergentes += 1;
                setDivergencias(divergentes);

                if (current >= scanTotal) {
                    clearInterval(interval);
                    setIsScanning(false);
                }
            }, 500); // 500ms per row
            
            return () => clearInterval(interval);
        } else {
            setIsScanning(false);
        }
    }, [funcionarios, isScanning, scanTotal]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Revisão OneDrive</h2>}
        >
            <Head title="Revisão OneDrive - Funcionários" />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500 rounded-lg shadow-sm">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revisão de Arquivos — OneDrive</h1>
                            <p className="text-sm text-gray-500 mt-1">Verificação de integridade entre os cadastros e as pastas estruturadas no SharePoint/OneDrive.</p>
                        </div>
                    </div>
                    <Link
                        href={route('admin.funcionarios.index')}
                        className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg shadow-sm transition-all"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Voltar para Funcionários
                    </Link>
                </div>

                {/* Progress Bar do Scan */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        {isScanning ? (
                            <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        ) : (
                            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <span className="font-semibold text-blue-900">
                            {isScanning ? 'Iniciando verificação com a API do Microsoft Graph...' : 'Verificação do OneDrive concluída!'}
                        </span>
                    </div>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        {scanProgress} / {scanTotal}
                    </div>
                </div>

                {/* Alert Final de Divergências */}
                {!isScanning && divergencias > 0 && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl shadow-sm animate-fade-in-up">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-amber-800 font-bold">
                                    <span className="text-lg mr-1">{divergencias}</span>
                                    funcionário(s) com divergências de pastas/arquivos encontrado(s).
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabela de Resultados */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Funcionário</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Localização e Função</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Status (OneDrive)</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {!funcionarios || funcionarios?.data?.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                            Nenhum funcionário na base para verificar.
                                        </td>
                                    </tr>
                                ) : (
                                    funcionarios.data.map((f, idx) => {
                                        const isChecked = idx < scanProgress;
                                        // Mock random status para interface UI
                                        const isDivergent = isChecked && idx % 7 === 0; 

                                        return (
                                            <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex-grow-1">
                                                        <h6 className="text-sm font-bold text-gray-900 mb-1">{f.nome}</h6>
                                                        <div className="mt-1">
                                                            {isChecked ? (
                                                                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                    Verificado em {new Date().toLocaleTimeString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs italic text-gray-400 flex items-center gap-1">
                                                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                    Aguardando verificação...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                            {f.obra?.nome || 'Matriz'}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span>{f.setor?.nome || 'Sem setor'}</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span>{f.funcao?.funcao || 'Sem função'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {!isChecked ? (
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                                                        </span>
                                                    ) : isDivergent ? (
                                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-sm animate-pulse">
                                                            Divergência de Pasta
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            Pasta Sincronizada
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Link href={route('admin.funcionarios.edit', f.id)} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded transition-colors" title="Editar">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </Link>
                                                        <Link href={route('admin.funcionarios.show', f.id)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Visualizar Cadastro">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
