import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Dashboard({ companies, currentCompany }) {
    return (
        <AuthenticatedLayout header="Dashboard">
            <Head title="Dashboard" />

            <div className="max-w-4xl mx-auto py-8">
                <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

                {currentCompany ? (
                    <p className="mb-4">
                        <span className="font-semibold">Empresa atual: </span>
                        {currentCompany.name}
                    </p>
                ) : (
                    <p className="mb-4 text-red-600">
                        Nenhuma empresa selecionada. 
                        <Link href={route('companies.select')} className="underline ml-1">
                            Clique aqui para selecionar.
                        </Link>
                    </p>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                    <h2 className="font-semibold mb-4 text-gray-800">Minhas empresas</h2>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                        {companies.length > 0 ? (
                            companies.map(company => (
                                <li key={company.id}>{company.name}</li>
                            ))
                        ) : (
                            <li>Você ainda não possui empresas cadastradas.</li>
                        )}
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
