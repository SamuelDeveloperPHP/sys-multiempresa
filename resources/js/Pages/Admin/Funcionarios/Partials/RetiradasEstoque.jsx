import React from 'react';

export default function RetiradasEstoque({ funcionario }) {
    const epiRetirados = funcionario.epi_retirados || [];

    return (
        <div className="animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-6">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        EPI's, Ferramentas e Uniformes
                    </h3>
                    <a href={`/admin/funcionarios/${funcionario.id}/ficha-epi`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Imprimir Ficha de EPI
                    </a>
                </div>

                <div className="p-6">
                    {epiRetirados.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Nenhum equipamento em posse</h4>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Este funcionário não possui EPIs, Ferramentas ou Uniformes vinculados em seu nome pelo almoxarifado.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Tabela de Retiradas para o futuro */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
