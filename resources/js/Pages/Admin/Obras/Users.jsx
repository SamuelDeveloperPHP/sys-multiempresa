import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

export default function Users({ obra, companyUsers }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
        role: 'member',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.obras.users.attach', obra.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <AuthenticatedLayout header={`Equipe da Obra - ${obra.nome_fantasia}`}>
            <Head title={`Equipe da Obra - ${obra.nome_fantasia}`} />

            {flash.message && (
                <div className="mb-6 bg-[#f0f9f8] border border-[#c1ede5] text-[#008f75] px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
                    {flash.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Adicionar Membro</h3>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Selecione o Usuário</label>
                                <select 
                                    className="mt-2 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-[#00b393] focus:border-[#00b393] px-3 py-2 text-sm"
                                    value={data.user_id}
                                    onChange={e => setData('user_id', e.target.value)}
                                >
                                    <option value="" disabled>Escolha um usuário da empresa...</option>
                                    {companyUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                                {errors.user_id && <div className="mt-1 text-xs text-red-600 font-medium">{errors.user_id}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nível de Acesso (Cargo na Obra)</label>
                                <select 
                                    className="mt-2 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-[#00b393] focus:border-[#00b393] px-3 py-2 text-sm"
                                    value={data.role}
                                    onChange={e => setData('role', e.target.value)}
                                >
                                    <option value="admin">Administrador da Obra (Acesso Total)</option>
                                    <option value="member">Membro (Pode editar tickets e lançamentos)</option>
                                    <option value="viewer">Visualizador (Apenas Leitura)</option>
                                </select>
                                {errors.role && <div className="mt-1 text-xs text-red-600 font-medium">{errors.role}</div>}
                            </div>
                            <button
                                type="submit"
                                disabled={processing || !data.user_id}
                                className="w-full justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00b393] hover:bg-[#009b80] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00b393] transition-colors disabled:opacity-50 mt-4"
                            >
                                {processing ? 'Adicionando...' : 'Adicionar à Obra'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Membros Atuais e Permissões</h3>
                            <Link href={route('admin.obras.index')} className="text-sm font-semibold text-blue-600 hover:underline">
                                &larr; Voltar para Obras
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold tracking-wider">Usuário</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider">Cargo</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider text-right">Remover</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {obra.users && obra.users.length > 0 ? (
                                        obra.users.map(user => (
                                            <tr key={user.id} className="bg-white hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${user.pivot.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {user.pivot.role === 'admin' ? 'Admin' : (user.pivot.role === 'member' ? 'Membro' : 'Visualizador')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link 
                                                        href={route('admin.obras.users.detach', { obra: obra.id, user: user.id })} 
                                                        method="delete" 
                                                        as="button" 
                                                        className="text-red-500 hover:text-red-700 font-medium hover:underline text-sm"
                                                    >
                                                        Remover
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                                Nenhum usuário vinculado a esta obra ainda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
