import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

export default function Edit({ category, parents }) {
    const { errors } = usePage().props;
    const { data, setData, put, processing } = useForm({
        name: category.name || '',
        slug: category.slug || '',
        parent_id: category.parent_id || '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.blog.categories.update', category.id));
    };

    return (
        <AuthenticatedLayout header="Editar Categoria">
            <Head title="Editar Categoria" />

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Editar Categoria</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Atualize os dados da categoria #{category.id}.
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
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                                required
                            />
                            {errors.name && <div className="mt-1 text-sm text-red-600">{errors.name}</div>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Categoria Pai
                            </label>
                            <select
                                id="parent_id"
                                value={data.parent_id}
                                onChange={e => setData('parent_id', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                            >
                                <option value="">Nenhuma</option>
                                {parents.map(parent => (
                                    <option key={parent.id} value={parent.id}>{parent.name}</option>
                                ))}
                            </select>
                            {errors.parent_id && <div className="mt-1 text-sm text-red-600">{errors.parent_id}</div>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                                Slug (opcional)
                            </label>
                            <input
                                type="text"
                                id="slug"
                                value={data.slug}
                                onChange={e => setData('slug', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                                placeholder="Gerado automaticamente se em branco"
                            />
                            {errors.slug && <div className="mt-1 text-sm text-red-600">{errors.slug}</div>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Link
                            href={route('admin.blog.categories.index')}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 bg-[#557bbb] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#009b80] transition-colors disabled:opacity-50"
                        >
                            Atualizar
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
