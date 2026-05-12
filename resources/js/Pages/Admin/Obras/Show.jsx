import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Show({ obra }) {
    return (
        <AuthenticatedLayout header={`Detalhes da Obra - ${obra.nome_fantasia}`}>
            <Head title={`Detalhes da Obra - ${obra.nome_fantasia}`} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">{obra.nome_fantasia}</h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">{obra.razao_social || 'Sem razão social cadastrada'}</p>
                    </div>
                    <Link href={route('admin.obras.index')} className="text-sm font-semibold text-blue-600 hover:underline">
                        &larr; Voltar para Lista
                    </Link>
                </div>
                
                <div className="p-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-semibold">{obra.status}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">CNPJ</dt>
                            <dd className="mt-1 text-sm text-gray-900">{obra.cnpj || '--'}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{obra.email || '--'}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Celular</dt>
                            <dd className="mt-1 text-sm text-gray-900">{obra.celular || '--'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Endereço Completo</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {obra.endereco ? `${obra.endereco}, ${obra.numero} ${obra.complemento} - ${obra.bairro}, ${obra.cidade}/${obra.estado} - CEP: ${obra.cep}` : 'Não informado'}
                            </dd>
                        </div>
                    </dl>
                    
                    <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                        <Link
                            href={route('admin.obras.edit', obra.id)}
                            className="inline-flex justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Editar Detalhes
                        </Link>
                        <Link
                            href={route('admin.obras.users', obra.id)}
                            className="inline-flex justify-center px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                        >
                            Gerenciar Membros
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
