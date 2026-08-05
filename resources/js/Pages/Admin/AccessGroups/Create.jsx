import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AccessGroupForm from './AccessGroupForm';

export default function Create({ company, groupedModules, obras = [], auth }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Novo Nível de Acesso</h2>}
        >
            <Head title="Novo Grupo de Acesso" />

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        href={route('admin.users.permissions.index')}
                        className="text-sm text-gray-500 hover:text-[#557bbb] flex items-center gap-1 w-fit mb-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar para os Níveis de Acesso
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Criar Grupo de Acesso</h1>
                    <p className="text-sm text-gray-500 mt-1">Defina o nome, as obras e as permissões herdadas por todos os usuários deste grupo.</p>
                </div>

                <AccessGroupForm
                    company={company}
                    groupedModules={groupedModules}
                    obras={obras}
                    isEdit={false}
                />
            </div>
        </AuthenticatedLayout>
    );
}
