import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function DocsObrigatorios({ funcionario }) {
    // Esses dados virão do backend. Usamos vazio se não houver.
    const qualificacoes = funcionario.qualificacao_funcoes || [];
    
    // Estado para arquivos selecionados e datas
    const [formData, setFormData] = useState({});

    const handleFileChange = (idQualificacao, file) => {
        setFormData(prev => ({
            ...prev,
            [idQualificacao]: { ...prev[idQualificacao], file }
        }));
    };

    const handleDateChange = (idQualificacao, date) => {
        setFormData(prev => ({
            ...prev,
            [idQualificacao]: { ...prev[idQualificacao], data_conclusao: date }
        }));
    };

    const handleSubmit = (e, qualificacao) => {
        e.preventDefault();
        const data = formData[qualificacao.id_qualificacao];
        if (!data || !data.file) {
            alert('Por favor, selecione um arquivo para anexar.');
            return;
        }

        router.post(route('admin.funcionarios.anexos', funcionario.id), {
            id_qualificacao: qualificacao.id_qualificacao,
            file: data.file,
            data_conclusao: data.data_conclusao || '',
            tempo_validade: qualificacao.tempo_validade
        }, {
            preserveScroll: true,
            onSuccess: () => {
                alert('Documento anexado com sucesso!');
                // Limpar arquivo do form
                setFormData(prev => ({
                    ...prev,
                    [qualificacao.id_qualificacao]: { ...prev[qualificacao.id_qualificacao], file: null }
                }));
            }
        });
    };

    return (
        <div className="animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-6">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Documentos Requeridos da Função
                        <small className="text-gray-500 font-normal ml-2 text-sm">(Dúvidas? Clique no ícone de informação abaixo)</small>
                    </h4>
                </div>

                <div className="p-0 overflow-x-auto">
                    {qualificacoes.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Nenhuma exigência mapeada</h4>
                            <p className="text-gray-500 max-w-md mx-auto">
                                A função cadastrada não possui documentos obrigatórios vinculados (ASO, PGR, PCMSO) ou os mesmos não foram atrelados à Matriz de Treinamentos ainda.
                            </p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-3 py-3 text-center w-12"><i className="mdi mdi-information-outline"></i></th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Documento</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Validade Regra</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Arquivo</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Data do Doc</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Vencimento</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Aprovação</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Sincronizado</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {qualificacoes.map((qualificacao, idx) => {
                                    // Cálculo rápido visual
                                    const isVencido = qualificacao.data_validade_doc && new Date(qualificacao.data_validade_doc) < new Date();
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-3 py-3 text-center">
                                                <button type="button" className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded transition" title="Ver Detalhes">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 font-semibold text-gray-800">
                                                {qualificacao.documento_nome || 'Documento Obrigatório'}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {qualificacao.tempo_validade === 0 ? (
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">Permanente</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-bold">{qualificacao.tempo_validade} meses</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <input 
                                                    type="file" 
                                                    onChange={(e) => handleFileChange(qualificacao.id_qualificacao, e.target.files[0])}
                                                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-md cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <input 
                                                    type="date" 
                                                    value={formData[qualificacao.id_qualificacao]?.data_conclusao || qualificacao.data_conclusao || ''}
                                                    onChange={(e) => handleDateChange(qualificacao.id_qualificacao, e.target.value)}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1.5"
                                                />
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {qualificacao.data_conclusao ? (
                                                    !qualificacao.data_validade_doc && qualificacao.situacao_doc === 2 ? (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">Permanente</span>
                                                    ) : qualificacao.data_validade_doc ? (
                                                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${isVencido ? 'bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,0.2)] animate-pulse' : 'bg-blue-100 text-blue-800'}`}>
                                                            {new Date(qualificacao.data_validade_doc).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">Aguardando...</span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {qualificacao.situacao_doc === 1 ? (
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">Pendente</span>
                                                ) : qualificacao.situacao_doc === 2 ? (
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">Sim</span>
                                                ) : qualificacao.situacao_doc === 18 ? (
                                                    <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs font-bold">Não</span>
                                                ) : (
                                                    <span className="text-gray-400">---</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {qualificacao.nome_arquivo ? (
                                                    qualificacao.arquivo_sincronizado ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-xs font-semibold">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                            OneDrive OK
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-semibold animate-pulse" title="Arquivo perdido ou falha de upload">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            ARQUIVO PERDIDO
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400 text-xs">Sem arquivo</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={(e) => handleSubmit(e, qualificacao)} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition" title="Fazer Upload">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    </button>
                                                    {qualificacao.id_anexo && (
                                                        <button type="button" className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition" title="Remover Documento">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
