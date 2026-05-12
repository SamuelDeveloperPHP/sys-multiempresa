{{-- resources/views/layouts/app.blade.php --}}
@php
    use App\Models\Company;

    $currentCompany = null;

    if (auth()->check() && session('current_company_id')) {
        $currentCompany = Company::find(session('current_company_id'));
    }
@endphp

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Laravel') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">


    <!-- Scripts -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="font-sans antialiased bg-gray-100">
<div class="min-h-screen flex">

    {{-- SIDEBAR ÚNICA --}}
    @include('layouts.sidebar')

    {{-- CONTEÚDO PRINCIPAL --}}
    <div class="flex-1 flex flex-col min-h-screen">

        {{-- Topbar --}}
        <header class="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6">
            <div class="flex items-center gap-3">
                @if (isset($header))
                    <h2 class="font-semibold text-lg md:text-xl text-gray-800 leading-tight">
                        {{ $header }}
                    </h2>
                @else
                    <h2 class="font-semibold text-lg md:text-xl text-gray-800 leading-tight">
                        Dashboard
                    </h2>
                @endif
            </div>

            {{-- Empresa atual no topo --}}
            <div class="hidden md:flex items-center gap-2 text-xs">
                @if ($currentCompany)
                    <span class="text-gray-400">Empresa:</span>
                    <span class="px-3 py-1 rounded-full bg-[#f0f9f8] text-[#00b393] font-medium border border-[#c1ede5]">
                        {{ $currentCompany->name }}
                    </span>
                    <a href="{{ route('companies.select') }}"
                       class="text-[#6690f4] text-xs font-semibold ml-2 hover:underline">
                        trocar
                    </a>
                @else
                    <a href="{{ route('companies.select') }}"
                       class="text-red-600 text-xs font-semibold hover:underline">
                        Nenhuma empresa selecionada
                    </a>
                @endif
            </div>
        </header>

        {{-- Slot do conteúdo das páginas --}}
        <main class="flex-1 p-4 md:p-6">
            {{ $slot }}
        </main>

        {{-- Rodapé com usuário --}}
        <footer class="border-t bg-white px-6 py-3 text-[11px] text-gray-500 flex justify-between items-center shadow-inner">
            <span class="font-medium text-gray-600">Sys-Multiempresa &copy; {{ date('Y') }}</span>
            <span class="text-gray-400">{{ Auth::user()->email }}</span>
        </footer>
    </div>
</div>
</body>
</html>
