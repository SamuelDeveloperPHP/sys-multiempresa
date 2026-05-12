import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Index({ companies, canManage, createRoute }) {
    const { flash } = usePage().props;

    return (
        <AuthenticatedLayout header="Gerenciar Empresas">
            <Head title="Empresas" />

            {flash.message && (
                <div className="mb-6 bg-[#f0f9f8] border border-[#c1ede5] text-[#008f75] px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
                    {flash.message}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 tracking-tight">Suas Empresas</h3>
                        <p className="text-sm text-gray-500 mt-1">Administre ou acesse os espaços de trabalho vinculados ao seu perfil.</p>
                    </div>
                    <Link href={route(createRoute)} className="px-4 py-2 bg-[#00b393] text-white text-sm font-semibold rounded-lg hover:bg-[#009b80] transition-colors shadow-sm flex items-center">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Nova Empresa
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold tracking-wider">Nome da Empresa</th>
                                <th className="px-6 py-4 font-semibold tracking-wider w-32">Status</th>
                                <th className="px-6 py-4 font-semibold tracking-wider text-right w-48">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {companies.length > 0 ? (
                                companies.map(company => (
                                    <tr key={company.id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{company.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">Criada em {new Date(company.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {company.is_active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={route('companies.edit', company.id)} className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title="Editar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </Link>
                                                {canManage && (
                                                    <Link href={route('companies.destroy', company.id)} method="delete" as="button" className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Excluir">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                            <p className="text-sm font-medium text-gray-500">Nenhuma empresa encontrada no momento.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
