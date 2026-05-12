@extends('layouts.blog')

@section('title', 'Blog')

@section('content')
    {{-- título + filtro categoria --}}
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Últimas notícias</h1>
            @if($categorySlug)
                <p class="text-sm text-gray-500">
                    Categoria:
                    <span class="font-medium">
                        {{ optional($categories->flatMap->children->push(...$categories))->firstWhere('slug', $categorySlug)->name ?? '' }}
                    </span>
                </p>
            @else
                <p class="text-sm text-gray-500">Confira as novidades mais recentes.</p>
            @endif
        </div>
    </div>

    @if($posts->isEmpty())
        <div class="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
            Nenhuma notícia encontrada.
        </div>
    @else
        {{-- grid de cards --}}
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @foreach($posts as $post)
                <article class="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                    @if($post->image_path)
                        <a href="{{ route('blog.show', $post->slug) }}">
                            <img src="{{ asset($post->image_path) }}"
                                 alt="{{ $post->title }}"
                                 class="w-full h-40 object-cover">
                        </a>
                    @endif

                    <div class="p-4 flex flex-col h-full">
                        {{-- categoria --}}
                        @if($post->category)
                            <a href="{{ route('blog.index', ['categoria' => $post->category->slug]) }}"
                               class="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-indigo-50 text-indigo-700 mb-2">
                                {{ $post->category->name }}
                            </a>
                        @endif

                        {{-- título --}}
                        <h2 class="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                            <a href="{{ route('blog.show', $post->slug) }}" class="hover:text-indigo-600">
                                {{ $post->title }}
                            </a>
                        </h2>

                        {{-- meta --}}
                        <div class="text-[11px] text-gray-400 mb-3">
                            {{ optional($post->published_at)->format('d/m/Y') }}
                            • por {{ $post->author->name ?? 'Equipe' }}
                        </div>

                        {{-- resumo --}}
                        <p class="text-sm text-gray-600 line-clamp-3 mb-4">
                            {{ $post->excerpt }}
                        </p>

                        <div class="mt-auto flex justify-between items-center">
                            <a href="{{ route('blog.show', $post->slug) }}"
                               class="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                Ler mais →
                            </a>
                        </div>
                    </div>
                </article>
            @endforeach
        </div>

        {{-- paginação --}}
        <div class="mt-8">
            {{ $posts->onEachSide(1)->links() }}
        </div>
    @endif
@endsection
