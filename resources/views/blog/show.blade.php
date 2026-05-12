@extends('layouts.blog')

@section('title', $post->title)

@section('content')
    <article class="bg-white border rounded-lg overflow-hidden shadow-sm">
        @if($post->image_path)
            <img src="{{ asset($post->image_path) }}"
                 alt="{{ $post->title }}"
                 class="w-full h-72 object-cover">
        @endif

        <div class="p-6 md:p-8">
            {{-- categoria --}}
            @if($post->category)
                <a href="{{ route('blog.index', ['categoria' => $post->category->slug]) }}"
                   class="inline-flex items-center px-3 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-700 mb-3">
                    {{ $post->category->name }}
                </a>
            @endif

            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {{ $post->title }}
            </h1>

            <div class="flex flex-wrap items-center text-xs text-gray-400 mb-6 gap-3">
                <span>por {{ $post->author->name ?? 'Equipe' }}</span>
                <span>•</span>
                <span>{{ optional($post->published_at)->format('d/m/Y H:i') }}</span>
            </div>

            <div class="prose prose-sm md:prose-base max-w-none prose-headings:mt-6 prose-headings:mb-2 prose-img:rounded-lg">
                {!! nl2br(e($post->body)) !!}
                {{-- se usar editor com HTML seguro, pode tirar o e() --}}
            </div>
        </div>
    </article>

    {{-- Leia também --}}
    @if($related->isNotEmpty())
        <section class="mt-10">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Leia também</h2>
            <div class="grid gap-4 md:grid-cols-3">
                @foreach($related as $item)
                    <a href="{{ route('blog.show', $item->slug) }}"
                       class="bg-white border rounded-lg p-4 hover:shadow-sm transition block">
                        <div class="text-xs text-gray-400 mb-1">
                            {{ optional($item->published_at)->format('d/m/Y') }}
                        </div>
                        <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                            {{ $item->title }}
                        </h3>
                        <p class="text-xs text-gray-500 line-clamp-2">
                            {{ $item->excerpt }}
                        </p>
                    </a>
                @endforeach
            </div>
        </section>
    @endif
@endsection
