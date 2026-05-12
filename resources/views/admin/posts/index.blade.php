<x-app-layout>
    <div class="max-w-12xl mx-auto py-8">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold text-gray-800">
                    Blog – Posts
                </h1>
                <p class="text-sm text-gray-500">
                    Gerencie as publicações do blog, categorias e publicação.
                </p>
            </div>

            <a href="{{ route('admin.posts.create') }}"
               class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                + Novo post
            </a>
        </div>

        {{-- ALERTAS --}}
        @if(session('success'))
            <div class="mb-4 rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                {{ session('success') }}
            </div>
        @endif

        @if($errors->has('error'))
            <div class="mb-4 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                {{ $errors->first('error') }}
            </div>
        @endif

        <div class="bg-white shadow-sm rounded-lg overflow-hidden">
            {{-- filtros --}}
            <div class="px-4 py-3 border-b border-gray-100">
                <form method="GET" action="{{ route('admin.posts.index') }}"
                      class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-gray-600">Busca</label>
                        <input type="text"
                               name="q"
                               value="{{ $filters['q'] ?? '' }}"
                               placeholder="Título ou resumo"
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-600">Categoria</label>
                        <select name="category_id"
                                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                            <option value="">Todas</option>
                            @foreach($categories as $cat)
                                <option value="{{ $cat->id }}"
                                    @selected(($filters['category_id'] ?? '') == $cat->id)>
                                    {{ $cat->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-600">Publicado</label>
                        <select name="published"
                                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                            <option value="">Todos</option>
                            <option value="1" @selected(($filters['published'] ?? '') === '1')>Somente publicados</option>
                            <option value="0" @selected(($filters['published'] ?? '') === '0')>Rascunhos</option>
                        </select>
                    </div>

                    <div class="md:col-span-4 flex justify-end gap-2">
                        @if(!empty(array_filter($filters ?? [])))
                            <a href="{{ route('admin.posts.index') }}"
                               class="inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                                Limpar
                            </a>
                        @endif
                        <button type="submit"
                                class="inline-flex items-center px-4 py-1.5 text-xs font-semibold rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            {{-- tabela --}}
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100 text-sm">
                    <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Autor</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Publicado em</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                    </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                    @forelse($posts as $post)
                        <tr>
                            <td class="px-4 py-2">
                                <div class="text-sm font-medium text-gray-900">
                                    {{ $post->title }}
                                </div>
                                <div class="text-xs text-gray-400">
                                    /blog/{{ $post->slug }}
                                </div>
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-600">
                                {{ $post->category->name ?? '-' }}
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-600">
                                {{ $post->author->name ?? '-' }}
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-600">
                                {{ optional($post->published_at)->format('d/m/Y H:i') ?? '-' }}
                            </td>
                            <td class="px-4 py-2">
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs
                                    {{ $post->is_published ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700' }}">
                                    {{ $post->is_published ? 'Publicado' : 'Rascunho' }}
                                </span>
                            </td>
                            <td class="px-4 py-2 text-right">
                                <div class="inline-flex items-center gap-1">
                                    <a href="{{ route('blog.show', $post->slug) }}"
                                       target="_blank"
                                       class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50">
                                        Ver
                                    </a>

                                    <a href="{{ route('admin.posts.edit', $post) }}"
                                       class="px-2 py-1 text-xs rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                        Editar
                                    </a>

                                    <form action="{{ route('admin.posts.destroy', $post) }}"
                                          method="POST"
                                          onsubmit="return confirm('Tem certeza que deseja remover este post?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit"
                                                class="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">
                                            Excluir
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="px-4 py-6 text-center text-sm text-gray-500">
                                Nenhum post encontrado.
                            </td>
                        </tr>
                    @endforelse
                    </tbody>
                </table>
            </div>

            @if($posts->hasPages())
                <div class="px-4 py-3 border-t border-gray-100">
                    {{ $posts->links() }}
                </div>
            @endif
        </div>
    </div>
</x-app-layout>
