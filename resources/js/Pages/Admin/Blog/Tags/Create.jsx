import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

export default function Create() {
    const { errors } = usePage().props;
    const { data, setData, post, processing } = useForm({
        name: '',
        slug: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.blog.tags.store'));
    };

    return (
        <AuthenticatedLayout header="Nova Tag">
            <Head title="Nova Tag" />

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Cadastrar Tag</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Preencha os dados abaixo para criar uma nova tag.
                    </p>
                </div>

                {errors.error && (
                    <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                        {errors.error}
                    </div>
                )}

                <form onSubmit={submit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Nome *
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#00b393] focus:border-[#00b393] sm:text-sm"
                                required
                            />
                            {errors.name && <div className="mt-1 text-sm text-red-600">{errors.name}</div>}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                                Slug (opcional)
                            </label>
                            <input
                                type="text"
                                id="slug"
                                value={data.slug}
                                onChange={e => setData('slug', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#00b393] focus:border-[#00b393] sm:text-sm"
                                placeholder="Gerado automaticamente se em branco"
                            />
                            {errors.slug && <div className="mt-1 text-sm text-red-600">{errors.slug}</div>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Link
                            href={route('admin.blog.tags.index')}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 bg-[#00b393] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#009b80] transition-colors disabled:opacity-50"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
