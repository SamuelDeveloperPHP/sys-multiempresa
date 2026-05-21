import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Create({ companies, categories, tags }) {
    const { errors } = usePage().props;
    
    // Para lidar com upload de múltiplos arquivos no Inertia, é melhor usar o helper `useForm`
    const { data, setData, post, processing } = useForm({
        title: '',
        description: '',
        content: '',
        category_id: '',
        is_published: false,
        published_at: '',
        companies: [],
        images: null,
    });

    const [imagePreview, setImagePreview] = useState([]);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.posts.store'));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setData('images', files);

        // Previews
        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreview(previews);
    };

    const handleCompanyToggle = (companyId) => {
        let selected = [...data.companies];
        if (selected.includes(companyId)) {
            selected = selected.filter(id => id !== companyId);
        } else {
            selected.push(companyId);
        }
        setData('companies', selected);
    };

    return (
        <AuthenticatedLayout header="Novo Post">
            <Head title="Novo Post" />

            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Escrever Post</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Crie um novo post para o blog.
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
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Título *
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                                required
                            />
                            {errors.title && <div className="mt-1 text-sm text-red-600">{errors.title}</div>}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Resumo / Descrição (opcional)
                            </label>
                            <textarea
                                id="description"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                rows="2"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                            ></textarea>
                            {errors.description && <div className="mt-1 text-sm text-red-600">{errors.description}</div>}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                                Conteúdo HTML *
                            </label>
                            <textarea
                                id="content"
                                value={data.content}
                                onChange={e => setData('content', e.target.value)}
                                rows="8"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] font-mono sm:text-sm text-gray-800"
                                required
                                placeholder="<p>Escreva o conteúdo aqui...</p>"
                            ></textarea>
                            {errors.content && <div className="mt-1 text-sm text-red-600">{errors.content}</div>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Categoria
                            </label>
                            <select
                                id="category_id"
                                value={data.category_id}
                                onChange={e => setData('category_id', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                            >
                                <option value="">Nenhuma</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            {errors.category_id && <div className="mt-1 text-sm text-red-600">{errors.category_id}</div>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="published_at" className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Publicação (opcional)
                            </label>
                            <input
                                type="datetime-local"
                                id="published_at"
                                value={data.published_at}
                                onChange={e => setData('published_at', e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#557bbb] focus:border-[#557bbb] sm:text-sm"
                            />
                            {errors.published_at && <div className="mt-1 text-sm text-red-600">{errors.published_at}</div>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_published}
                                    onChange={e => setData('is_published', e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-[#557bbb] border-gray-300 rounded focus:ring-[#557bbb]"
                                />
                                <span className="text-sm font-medium text-gray-700">Publicar imediatamente</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vincular a Empresas (deixe vazio para Global)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {companies.map(company => (
                                <label key={company.id} className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={data.companies.includes(company.id)}
                                        onChange={() => handleCompanyToggle(company.id)}
                                        className="form-checkbox text-[#557bbb] border-gray-300 rounded focus:ring-[#557bbb]"
                                    />
                                    <span className="text-sm text-gray-700 truncate">{company.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Galeria de Imagens
                        </label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#e6f7f4] file:text-[#3a5a8c] hover:file:bg-[#d1f0eb] transition-colors"
                        />
                        {errors.images && <div className="mt-1 text-sm text-red-600">{errors.images}</div>}
                        
                        {imagePreview.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {imagePreview.map((src, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                                        <img src={src} className="w-full h-full object-cover" alt="Preview" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Link
                            href={route('admin.posts.index')}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 bg-[#557bbb] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#009b80] transition-colors disabled:opacity-50"
                        >
                            Salvar Post
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
