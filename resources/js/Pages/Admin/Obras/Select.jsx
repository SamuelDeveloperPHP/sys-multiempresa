import { Head, usePage, useForm, Link } from '@inertiajs/react';

export default function Select({ obras }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        obra_id: obras.length > 0 ? obras[0].id : ''
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('obras.set'));
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-4 px-4 font-sans antialiased text-gray-900">
            <Head title="Selecione uma Obra" />
            
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#00b393] via-teal-400 to-blue-500"></div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Selecionar Obra
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Escolha a obra em que deseja trabalhar
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-xl sm:px-10 border border-t-4 border-t-[#00b393] border-gray-100">
                    {flash.message && (
                         <div className="mb-4 bg-[#f0f9f8] border border-[#c1ede5] text-[#008f75] px-4 py-3 rounded-lg text-sm font-medium">
                            {flash.message}
                         </div>
                    )}
                    {flash.info && (
                         <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm font-medium">
                            {flash.info}
                         </div>
                    )}

                    {obras.length > 0 ? (
                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label htmlFor="obra" className="block text-sm font-medium text-gray-700">
                                    Obra
                                </label>
                                <div className="mt-2">
                                    <select
                                        id="obra"
                                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00b393] focus:border-transparent sm:text-sm font-medium bg-gray-50 text-gray-900 transition-colors"
                                        value={data.obra_id}
                                        onChange={e => setData('obra_id', e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {obras.map(obra => (
                                            <option key={obra.id} value={obra.id}>
                                                {obra.nome_fantasia} {obra.code ? `(${obra.code})` : ''} — {obra.status}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.obra_id && <div className="mt-2 text-sm text-red-600 font-medium">{errors.obra_id}</div>}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Link
                                    href={route('companies.select')}
                                    className="w-full sm:w-auto flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                                >
                                    Trocar empresa
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full sm:w-auto flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00b393] hover:bg-[#009b80] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00b393] transition-colors disabled:opacity-50"
                                >
                                    Continuar
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-gray-600">Você não possui obras vinculadas nesta empresa.</p>
                            <Link href={route('dashboard')} className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                                Voltar ao início
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
