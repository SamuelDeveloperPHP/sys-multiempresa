<x-app-layout>
    <div class="max-w-4xl mx-auto mt-8 space-y-6">

        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ $post->title }}</h1>

            <div class="space-x-2 text-sm">
                <a href="{{ route('admin.posts.edit', $post) }}"
                   class="text-blue-600 hover:underline">
                    Editar
                </a>

                <form action="{{ route('admin.posts.destroy', $post) }}"
                      method="POST"
                      class="inline"
                      onsubmit="return confirm('Confirma excluir este post?');">
                    @csrf
                    @method('DELETE')
                    <button type="submit"
                            class="text-red-600 hover:underline">
                        Excluir
                    </button>
                </form>
            </div>
        </div>

        {{-- META --}}
        <div class="bg-white rounded-lg shadow-sm p-4 text-sm space-y-1">
            <div>
                <span class="font-semibold text-gray-600">Categoria:</span>
                {{ $post->category->name ?? '-' }}
            </div>
            <div>
                <span class="font-semibold text-gray-600">Autor:</span>
                {{ $post->author->name ?? '-' }}
            </div>
            <div>
                <span class="font-semibold text-gray-600">Empresas:</span>
                {{ $post->companies->pluck('name')->implode(', ') ?: '-' }}
            </div>
            <div>
                <span class="font-semibold text-gray-600">Status:</span>
                @if($post->is_published)
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-green-50 text-green-700">
                        Publicado
                    </span>
                    <span class="text-xs text-gray-500 ml-2">
                        em {{ $post->published_at?->format('d/m/Y H:i') }}
                    </span>
                @else
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-yellow-50 text-yellow-700">
                        Rascunho
                    </span>
                @endif
            </div>
            <div>
                <span class="font-semibold text-gray-600">Cadastro:</span>
                {{ $post->created_at?->format('d/m/Y H:i') }}
            </div>
        </div>

        {{-- DESCRIÇÃO --}}
        @if($post->description)
            <div class="bg-white rounded-lg shadow-sm p-4">
                <p class="text-sm text-gray-700">
                    {{ $post->description }}
                </p>
            </div>
        @endif

        {{-- CONTEÚDO --}}
        <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="prose prose-sm max-w-none">
                {!! nl2br(e($post->content)) !!}
            </div>
        </div>

        {{-- GALERIA --}}
        @if($post->images->isNotEmpty())
            <div class="bg-white rounded-lg shadow-sm p-4">
                <h2 class="text-sm font-semibold text-gray-700 mb-2">Galeria de imagens</h2>

                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    @foreach($post->images as $image)
                        <div class="border rounded-md overflow-hidden">
                            <img src="{{ $image->url }}" alt=""
                                 class="w-full h-32 object-cover">
                        </div>
                    @endforeach
                </div>
            </div>
        @endif

        <div>
            <a href="{{ route('admin.posts.index') }}"
               class="text-sm text-gray-500 hover:text-gray-700">
                &larr; Voltar para lista
            </a>
        </div>
    </div>
</x-app-layout>
