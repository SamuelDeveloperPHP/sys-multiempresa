import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { safeHtml } from '@/utils/sanitize';

export default function Show({ post }) {
    return (
        <AuthenticatedLayout header={`Post: ${post.title}`}>
            <Head title={post.title} />

            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">
                            {post.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                {post.author?.name || 'Autor Desconhecido'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                {post.published_at ? new Date(post.published_at).toLocaleString('pt-BR') : 'Não publicado'}
                            </span>
                            {post.category && (
                                <>
                                    <span>•</span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100">
                                        {post.category.name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {post.is_published ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide">Publicado</span>
                        ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wide">Rascunho</span>
                        )}
                        <Link href={route('admin.posts.edit', post.id)} className="text-sm font-medium text-[#557bbb] hover:text-[#009b80] hover:underline flex items-center">
                            Editar
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </Link>
                    </div>
                </div>

                <div className="p-6 prose max-w-none prose-indigo prose-img:rounded-xl">
                    {post.description && (
                        <p className="lead text-gray-500 italic border-l-4 border-[#557bbb] pl-4 mb-8">
                            {post.description}
                        </p>
                    )}
                    <div dangerouslySetInnerHTML={safeHtml(post.content)} />
                </div>

                {post.images && post.images.length > 0 && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Galeria</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {post.images.map(img => (
                                <a key={img.id} href={`/${img.path}`} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <img src={`/${img.path}`} alt="Galeria" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {post.companies && post.companies.length > 0 && (
                    <div className="p-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Vinculado a:</h3>
                        <div className="flex flex-wrap gap-2">
                            {post.companies.map(company => (
                                <span key={company.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                    <svg className="mr-1.5 h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 8 8">
                                        <circle cx="4" cy="4" r="3" />
                                    </svg>
                                    {company.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-6 border-t border-gray-100 flex justify-end">
                    <Link
                        href={route('admin.posts.index')}
                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Voltar para Lista
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
