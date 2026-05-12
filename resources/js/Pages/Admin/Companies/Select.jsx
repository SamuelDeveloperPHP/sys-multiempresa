import { Head, usePage, useForm, Link } from '@inertiajs/react';

export default function Select({ companies }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        company_id: companies.length > 0 ? companies[0].id : ''
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('companies.set'));
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-4 px-4 font-sans antialiased text-gray-900">
            <Head title="Selecione uma Empresa" />
            
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-teal-400"></div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Acessar Workspace
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Selecione o espaço de trabalho para continuar
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-xl sm:px-10 border border-t-4 border-t-[#00b393] border-gray-100">
                    {flash.message && (
                         <div className="mb-4 bg-[#f0f9f8] border border-[#c1ede5] text-[#008f75] px-4 py-3 rounded-lg text-sm font-medium">
                            {flash.message}
                         </div>
                    )}

                    {companies.length > 0 ? (
                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                                    Suas Empresas
                                </label>
                                <div className="mt-2">
                                    <select
                                        id="company"
                                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00b393] focus:border-transparent sm:text-sm font-medium bg-gray-50 text-gray-900 transition-colors"
                                        value={data.company_id}
                                        onChange={e => setData('company_id', e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {companies.map(company => (
                                            <option key={company.id} value={company.id}>{company.name}</option>
                                        ))}
                                    </select>
                                    {errors.company_id && <div className="mt-2 text-sm text-red-600 font-medium">{errors.company_id}</div>}
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00b393] hover:bg-[#009b80] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00b393] transition-colors disabled:opacity-50"
                                >
                                    Entrar no Painel
                                </button>
                            </div>
                            
                            {/* Assuming they can also create a new one from here based on auth settings, though we'll just link to create if setup exists */}
                            <div className="pt-4 border-t border-gray-100 text-center">
                                <span className="text-sm text-gray-500">Ou deseja </span>
                                <Link href={route('companies.setup.create')} className="text-sm font-semibold text-[#6690f4] hover:underline">
                                    cadastrar nova empresa?
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-600">Você ainda não possui nenhuma empresa ativa para acessar o sistema.</p>
                            <Link href={route('companies.setup.create')} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00b393] hover:bg-[#009b80] transition-colors">
                                Criar Minha Primeira Empresa
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
