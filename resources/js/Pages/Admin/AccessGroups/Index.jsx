import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * Lista de Níveis de Acesso (grupos) da empresa corrente.
 *
 * Props:
 *  - groups  [{id,name,descricao,permissions_count,users_count}]
 *  - company {id,name}
 */
export default function Index({ groups = [], company, auth }) {
    const handleDelete = (group) => {
        if (confirm(`Remover o grupo "${group.name}"? Os usuários vinculados perdem a herança deste grupo (mantêm seus overrides individuais). Esta ação é irreversível.`)) {
            router.delete(route('admin.users.permissions.destroy', group.id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Níveis de Acesso</h2>}
        >
            <Head title="Níveis de Acesso" />

            <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Níveis de Acesso (Grupos)</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Crie grupos de permissões (ex.: Almoxarifes, TST, Qualidade, RH) e vincule usuários a eles no cadastro de cada conta.
                            {company?.name && <span className="text-gray-400"> · Empresa: <strong className="text-gray-600">{company.name}</strong></span>}
                        </p>
                    </div>

                    <Link
                        href={route('admin.users.permissions.create')}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg text-white bg-[#557bbb] hover:bg-[#3a5a8c] transition-all transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Novo Grupo
                    </Link>
                </div>

                {/* Card de Listagem */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"># ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grupo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Módulos c/ Permissão</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuários</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {groups.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.65" />
                                                </svg>
                                                Nenhum grupo de acesso cadastrado ainda.
                                                <Link href={route('admin.users.permissions.create')} className="text-[#557bbb] hover:text-[#3a5a8c] font-semibold mt-1">
                                                    Criar o primeiro grupo
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    groups.map((group) => (
                                        <tr key={group.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-400">
                                                {group.id.toString().padStart(4, '0')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900">{group.name}</div>
                                                {group.descricao && <div className="text-xs text-gray-500 mt-0.5 max-w-md">{group.descricao}</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                                                    {group.permissions_count ?? 0} módulo(s)
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-[#eef2f9] text-[#3a5a8c] border border-[#cfdcef]">
                                                    {group.users_count ?? 0} usuário(s)
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex border rounded-lg overflow-hidden shadow-sm shadow-[#557bbb]/5 w-fit ml-auto divide-x divide-gray-100">
                                                    <Link
                                                        href={route('admin.users.permissions.edit', group.id)}
                                                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition items-center justify-center"
                                                        title="Editar Grupo"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(group)}
                                                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition items-center justify-center"
                                                        title="Remover Grupo"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
