import PortalLayout from '../../Layouts/PortalLayout';

export default function Dashboard() {
    return (
        <PortalLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tickets Abertos</h3>
                            <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">2</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Faturas Pendentes</h3>
                            <div className="rounded-full bg-red-50 p-2 text-red-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">1</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contratos Ativos</h3>
                            <div className="rounded-full bg-green-50 p-2 text-green-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">3</p>
                    </div>
                </div>

                {/* Tabela Clean */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h3 className="text-base font-semibold text-gray-900 tracking-tight">Tickets Recentes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500">
                            <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Ticket</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Última Atualização</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">#TK-1049</div>
                                        <div className="text-gray-500 mt-1">Dúvida sobre fatura de Serviço Extra</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-full">Pendente</span>
                                    </td>
                                    <td className="px-6 py-4">Hoje, 14:30</td>
                                </tr>
                                <tr className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">#TK-1048</div>
                                        <div className="text-gray-500 mt-1">Acesso negado ao escopo da Obra Centro</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">Resolvido</span>
                                    </td>
                                    <td className="px-6 py-4">Ontem, 09:15</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
