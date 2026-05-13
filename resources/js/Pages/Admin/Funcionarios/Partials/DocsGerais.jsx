import React, { useState } from 'react';
import { router } from '@inertiajs/react';

export default function DocsGerais({ funcionario }) {
    const anexos_funcionarios = funcionario.anexos_funcionarios || [];
    const [isAprovador] = useState(true); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Formulario de Upload Avulso
    const [formData, setFormData] = useState({
        nome_qualificacao: '',
        data_conclusao: '',
        data_validade_doc: '',
        file: null
    });

    const handleAprovacao = (anexoId, situacao_doc) => {
        router.post(route('admin.funcionarios.aprovar_documentos', anexoId), {
            selectValue: situacao_doc,
            motivoReprovacao: ''
        }, {
            preserveScroll: true,
            onSuccess: () => alert('Status atualizado!')
        });
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!formData.file || !formData.nome_qualificacao) {
            alert('Por favor, preencha o nome do documento e anexe o arquivo.');
            return;
        }

        router.post(route('admin.funcionarios.adicionar_anexos'), {
            id_funcionario_anexo: funcionario.id,
            'nome_qualificacao[0]': formData.nome_qualificacao,
            'data_conclusao[0]': formData.data_conclusao,
            'data_validade_doc[0]': formData.data_validade_doc,
            'file[0]': formData.file
        }, {
            preserveScroll: true,
            onSuccess: () => {
                alert('Documento adicionado!');
                setIsModalOpen(false);
                setFormData({ nome_qualificacao: '', data_conclusao: '', data_validade_doc: '', file: null });
            }
        });
    };

    return (
        <div className="animate-fade-in-up">
            {/* MODAL ADICIONAR DOCUMENTO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Adicionar Documento Avulso</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Documento *</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" 
                                    placeholder="Ex: CNH, Comprovante de Residência"
                                    value={formData.nome_qualificacao}
                                    onChange={e => setFormData({...formData, nome_qualificacao: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Conclusão/Emissão</label>
                                    <input 
                                        type="date" 
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                        value={formData.data_conclusao}
                                        onChange={e => setFormData({...formData, data_conclusao: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Validade <span className="text-gray-400 font-normal">(se houver)</span></label>
                                    <input 
                                        type="date" 
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                        value={formData.data_validade_doc}
                                        onChange={e => setFormData({...formData, data_validade_doc: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Arquivo PDF/Imagem *</label>
                                <input 
                                    type="file" 
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-md cursor-pointer"
                                    onChange={e => setFormData({...formData, file: e.target.files[0]})}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg transition">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow transition">Fazer Upload</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-6 mt-6">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-800">Documentos Gerais (Avulsos)</h4>
                    <button type="button" onClick={() => setIsModalOpen(true)} className="btn bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-4 rounded text-sm flex items-center gap-2 shadow-sm transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Adicionar
                    </button>
                </div>

                <div className="p-0 overflow-x-auto">
                    {anexos_funcionarios.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">Nenhum documento geral anexado.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Arquivo</th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Cadastro</th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Validade</th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {anexos_funcionarios.map((anexo, idx) => {
                                    const isVencido = anexo.data_validade_doc && new Date(anexo.data_validade_doc) < new Date();
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">{anexo.nome_arquivo}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">
                                                {new Date(anexo.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {anexo.data_validade_doc ? (
                                                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${isVencido ? 'bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,0.2)] animate-pulse' : 'bg-blue-100 text-blue-800'}`}>
                                                        {new Date(anexo.data_validade_doc).toLocaleDateString('pt-BR')}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">Não possui</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <select 
                                                    className="block w-full max-w-[150px] mx-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1"
                                                    disabled={!isAprovador}
                                                    value={anexo.situacao_doc}
                                                    onChange={(e) => handleAprovacao(anexo.id, e.target.value)}
                                                >
                                                    <option value="1">Pendente</option>
                                                    <option value="2">Sim (Aprovado)</option>
                                                    <option value="18">Não (Reprovado)</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button type="button" className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition" title="Excluir Documento" onClick={() => alert('Excluir documento?')}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
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
