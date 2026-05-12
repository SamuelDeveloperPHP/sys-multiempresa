import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, useForm } from '@inertiajs/react';

export default function Index({ obras, filters }) {
    const { flash } = usePage().props;
    const { data, setData, get, processing } = useForm({
        q: filters.q || '',
        status: filters.status || '',
    });

    const handleSearch = (e) => {
        e.preventDefault();
        get(route('admin.obras.index'), { preserveState: true });
    };

    const statusColors = {
        Ativa: 'bg-green-100 text-green-800',
        Concluida: 'bg-blue-100 text-blue-800',
        Paralisada: 'bg-yellow-100 text-yellow-800',
        Cancelada: 'bg-red-100 text-red-800'
    };

    return (
        <AuthenticatedLayout header="Obras">
            <Head title="Obras" />

            {flash.message && (
                <div className="mb-6 bg-[#f0f9f8] border border-[#c1ede5] text-[#008f75] px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
                    {flash.message}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <form onSubmit={handleSearch} className="flex flex-1 items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <input
                                type="text"
                                placeholder="Buscar obra, CNPJ, código..."
                                value={data.q}
                                onChange={e => setData('q', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#00b393] focus:border-[#00b393] shadow-sm transition-colors"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <select
                            value={data.status}
                            onChange={e => setData('status', e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#00b393] focus:border-[#00b393] p-2.5 shadow-sm transition-colors"
                        >
                            <option value="">Todos os status</option>
                            <option value="Ativa">Ativa</option>
                            <option value="Concluida">Concluída</option>
                            <option value="Paralisada">Paralisada</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                        <button type="submit" className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm">
                            Filtrar
                        </button>
                    </form>
                    <Link href={route('admin.obras.create')} className="px-4 py-2 bg-[#00b393] text-white text-sm font-semibold rounded-lg hover:bg-[#009b80] transition-colors shadow-sm whitespace-nowrap flex items-center">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Nova Obra
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold tracking-wider">Obra</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">CNPJ / Código</th>
                                <th className="px-6 py-4 font-semibold tracking-wider w-32">Status</th>
                                <th className="px-6 py-4 font-semibold tracking-wider text-right w-48">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {obras.data.length > 0 ? (
                                obras.data.map(obra => (
                                    <tr key={obra.id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{obra.nome_fantasia}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{obra.cidade ? `${obra.cidade}/${obra.estado}` : 'Sem endereço'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 text-[13px]">{obra.cnpj || '--'}</div>
                                            <div className="text-xs text-gray-400 mt-0.5 font-mono">{obra.code || '--'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusColors[obra.status]}`}>
                                                {obra.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={route('admin.obras.users', obra.id)} className="p-1.5 text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors" title="Membros">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                </Link>
                                                <Link href={route('admin.obras.edit', obra.id)} className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title="Editar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </Link>
                                                <Link href={route('admin.obras.destroy', obra.id)} method="delete" as="button" className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Excluir">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        Nenhuma obra encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {obras.links && obras.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 overflow-auto">
                        <div className="flex justify-center flex-wrap gap-1">
                            {obras.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1.5 text-sm rounded ${link.active ? 'bg-[#00b393] text-white font-medium' : 'bg-white text-gray-500 hover:bg-gray-100'} ${!link.url && 'opacity-50 cursor-not-allowed'} border border-gray-200 transition-colors inline-block`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
