<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'Blog')</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="bg-gray-50 text-gray-800">

    {{-- Barra superior --}}
    <header class="bg-white border-b">
        <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="{{ route('blog.index') }}" class="flex items-center gap-2">
                <span
                    class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-sm">
                    B
                </span>
                <div>
                    <div class="text-sm font-semibold">Blog</div>
                    <div class="text-xs text-gray-400">Novidades & notícias</div>
                </div>
            </a>

            {{-- Menu categorias --}}
            <nav class="hidden md:flex items-center gap-4 text-sm">
                <a href="{{ route('blog.index') }}"
                    class="px-2 py-1 rounded hover:bg-gray-100 {{ request()->routeIs('blog.index') && !request('categoria') ? 'font-semibold text-indigo-600' : 'text-gray-600' }}">
                    Início
                </a>

                @foreach ($categories ?? [] as $cat)
                    <div class="relative group">
                        <a href="{{ route('blog.index', ['categoria' => $cat->slug]) }}"
                            class="px-2 py-1 rounded hover:bg-gray-100 {{ request('categoria') === $cat->slug ? 'font-semibold text-indigo-600' : 'text-gray-600' }}">
                            {{ $cat->name }}
                        </a>

                        @if ($cat->children->isNotEmpty())
                            <div
                                class="absolute left-0 mt-2 w-40 bg-white border rounded shadow-lg opacity-0 scale-95 transform origin-top group-hover:opacity-100 group-hover:scale-100 transition">
                                @foreach ($cat->children as $child)
                                    <a href="{{ route('blog.index', ['categoria' => $child->slug]) }}"
                                        class="block px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                                        {{ $child->name }}
                                    </a>
                                @endforeach
                            </div>
                        @endif
                    </div>
                @endforeach
            </nav>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-8">
        @yield('content')
    </main>

    <footer class="border-t bg-white mt-8">
        <div class="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-400 flex justify-between">
            <span>© {{ date('Y') }} Seu Blog.</span>
            <span>Construído com Laravel & Tailwind.</span>
        </div>
    </footer>
</body>

</html>
