import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UserForm from './UserForm';

export default function Edit({ user, companies, groupedModules, modulePermissions, auth }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Editar Usuário</h2>}
        >
            <Head title={`Editando: ${user.name}`} />

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        href={route('admin.users.index')}
                        className="text-sm text-gray-500 hover:text-[#00b393] flex items-center gap-1 w-fit mb-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar para a Lista
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Editar: {user.name}</h1>
                    <p className="text-sm text-gray-500 mt-1">Atualize os dados e revise o escopo de segurança da conta.</p>
                </div>

                <UserForm
                    user={user}
                    companies={companies}
                    groupedModules={groupedModules}
                    modulePermissions={modulePermissions}
                    isEdit={true}
                />
            </div>
        </AuthenticatedLayout>
    );
}
