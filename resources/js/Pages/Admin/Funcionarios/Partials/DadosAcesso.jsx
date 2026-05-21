import React from 'react';

export default function DadosAcesso({ funcionario, linkedUser }) {
    return (
        <div className="animate-fade-in-up">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-6">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Dados de Acesso (Login Web/Mobile)
                    </h3>
                    {linkedUser && (
                        <span className="px-3 py-1 bg-rise-100 text-rise-800 text-xs font-bold rounded-full">Conta Ativa</span>
                    )}
                </div>
                
                <div className="p-6">
                    {!linkedUser ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Usuário sem Acesso Digital</h4>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Este funcionário não possui um usuário criado para acessar o painel ou os aplicativos corporativos. Para habilitar o acesso, edite o cadastro e gere a credencial.
                            </p>
                            <a 
                                href={`/admin/funcionarios/edit/${funcionario.id}`}
                                className="inline-flex items-center justify-center px-6 py-2.5 bg-[#557bbb] hover:bg-[#3a5a8c] text-white font-bold rounded-lg shadow-md transition-all"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Habilitar Acesso
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-md font-bold text-gray-800 mb-4 pb-2 border-b">Informações da Conta</h4>
                                
                                <dl className="space-y-4">
                                    <div>
                                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail de Login</dt>
                                        <dd className="text-sm font-bold text-gray-900 mt-1 bg-gray-50 p-2 rounded border border-gray-200">{linkedUser.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nível de Permissão (Tipo)</dt>
                                        <dd className="mt-1">
                                            {linkedUser.type === 'super_admin' && <span className="badge bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold text-xs">Super Admin</span>}
                                            {linkedUser.type === 'admin' && <span className="badge bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-xs">Administrador</span>}
                                            {linkedUser.type === 'user' && <span className="badge bg-gray-100 text-gray-800 px-2 py-1 rounded font-bold text-xs">Usuário Padrão</span>}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data de Criação do Usuário</dt>
                                        <dd className="text-sm text-gray-800 mt-1">
                                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(linkedUser.created_at))}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-6 pt-4 border-t">
                                    <a 
                                        href={`/admin/funcionarios/edit/${funcionario.id}`}
                                        className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Editar permissões no cadastro
                                    </a>
                                </div>
                            </div>

                            <div>
                                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                    <h5 className="flex items-center gap-2 text-blue-800 font-bold mb-3">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Política de Segurança
                                    </h5>
                                    <ul className="space-y-2 text-sm text-blue-900/80">
                                        <li className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-rise-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Senhas devem ter no mínimo 8 caracteres.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-rise-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Devem conter letras maiúsculas e minúsculas.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-rise-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            A redefinição de senha e permissões modulares é feita pela tela de Edição de Cadastro.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
