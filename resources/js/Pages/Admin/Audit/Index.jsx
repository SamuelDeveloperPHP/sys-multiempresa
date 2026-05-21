import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { safeLabel } from '@/utils/sanitize';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ logs, users, companies, actions, modules, filters }) {
    const { flash, errors } = usePage().props;
    const { data, setData, get, processing } = useForm({
        user_id: filters.user_id || '',
        company_id: filters.company_id || '',
        module: filters.module || '',
        action: filters.action || '',
        route_name: filters.route_name || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        q: filters.q || '',
    });

    const [selectedAudit, setSelectedAudit] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        get(route('admin.audit.index'), { preserveState: true });
    };

    const handleClear = () => {
        get(route('admin.audit.index'));
    };

    return (
        <AuthenticatedLayout header="Auditoria do sistema">
            <Head title="Auditoria" />

            {errors.error && (
                <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                    {errors.error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Usuário</label>
                        <select
                            value={data.user_id}
                            onChange={e => setData('user_id', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                        >
                            <option value="">Todos</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Empresa</label>
                        <select
                            value={data.company_id}
                            onChange={e => setData('company_id', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                        >
                            <option value="">Todas</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Módulo</label>
                        <select
                            value={data.module}
                            onChange={e => setData('module', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                        >
                            <option value="">Todos</option>
                            {modules.filter(Boolean).map((m, idx) => (
                                <option key={idx} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Ação</label>
                        <select
                            value={data.action}
                            onChange={e => setData('action', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                        >
                            <option value="">Todas</option>
                            {actions.map((a, idx) => (
                                <option key={idx} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Rota</label>
                        <input
                            type="text"
                            value={data.route_name}
                            onChange={e => setData('route_name', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                            placeholder="admin.users.index"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Data inicial</label>
                        <input
                            type="date"
                            value={data.date_from}
                            onChange={e => setData('date_from', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Data final</label>
                        <input
                            type="date"
                            value={data.date_to}
                            onChange={e => setData('date_to', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Busca livre</label>
                        <input
                            type="text"
                            value={data.q}
                            onChange={e => setData('q', e.target.value)}
                            className="w-full border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] text-sm"
                            placeholder="descrição, módulo, rota..."
                        />
                    </div>

                    <div className="md:col-span-4 flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Limpar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 bg-[#557bbb] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#009b80] transition-colors"
                        >
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                        <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Data</th>
                                <th className="px-4 py-3 font-semibold">Usuário</th>
                                <th className="px-4 py-3 font-semibold">Empresa</th>
                                <th className="px-4 py-3 font-semibold">Módulo</th>
                                <th className="px-4 py-3 font-semibold">Ação</th>
                                <th className="px-4 py-3 font-semibold">Rota</th>
                                <th className="px-4 py-3 font-semibold">Descrição</th>
                                <th className="px-4 py-3 font-semibold">IP</th>
                                <th className="px-4 py-3 font-semibold">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.data.length > 0 ? (
                                logs.data.map(log => {
                                    const dateStr = new Date(log.created_at).toLocaleString('pt-BR');
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                {dateStr}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 font-medium">
                                                {log.user?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {log.company?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {log.module || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-gray-500 font-mono">
                                                {log.route_name}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-gray-700 max-w-xs truncate" title={log.description}>
                                                {log.description}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-gray-500 font-mono">
                                                {log.ip_address}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(log.before || log.after) ? (
                                                    <button
                                                        type="button"
                                                        className="text-[#557bbb] hover:text-[#009b80] text-[11px] font-medium underline"
                                                        onClick={() => setSelectedAudit(log)}
                                                    >
                                                        Ver JSON
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {logs.links && logs.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 overflow-auto">
                        <div className="flex justify-center flex-wrap gap-1">
                            {logs.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1.5 text-sm rounded ${link.active ? 'bg-[#557bbb] text-white font-medium' : 'bg-white text-gray-500 hover:bg-gray-100'} ${!link.url && 'opacity-50 cursor-not-allowed'} border border-gray-200 transition-colors inline-block`}
                                    dangerouslySetInnerHTML={safeLabel(link.label)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {selectedAudit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Detalhes JSON - #{selectedAudit.id}</h3>
                            <button
                                onClick={() => setSelectedAudit(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto bg-gray-900 flex-1">
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify({ before: selectedAudit.before, after: selectedAudit.after }, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedAudit(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
