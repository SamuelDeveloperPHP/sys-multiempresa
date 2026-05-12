{{-- resources/views/layouts/sidebar.blade.php --}}
@php
    use App\Helpers\CompanyContext;
    use Illuminate\Support\Facades\Route as RouteFacade;

    $company = CompanyContext::current();
    $currentRouteName = RouteFacade::currentRouteName();
@endphp

<aside class="w-60 bg-white border-r flex flex-col">
    {{-- Topo da sidebar --}}
    <div class="h-16 flex items-center px-4 border-b border-gray-100">
        <div class="flex items-center justify-center justify-items-center gap-2 w-full">
            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 via-blue-500 to-teal-400"></div>
            <span class="text-[22px] font-extrabold text-[#00b393] tracking-tighter">SGA<span class="text-gray-700">-Engeativos</span></span>
        </div>
    </div>

    <nav class="flex-1 px-3 py-4 text-sm overflow-y-auto">
        {{-- Dashboard fixo --}}
        <a href="{{ route('dashboard') }}"
           class="block mb-3 px-3 py-2 rounded-lg text-[13px] transition-colors
                {{ request()->routeIs('dashboard') ? 'bg-[#f0f9f8] text-[#00b393] font-medium shadow-sm border border-[#e1f5f2]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent' }}">
            Dashboard
        </a>

        {{-- Seções dinâmicas (acordeon animado) --}}
        @foreach($menuSections ?? [] as $section)
            @php
                $sectionId = 'sidebar-section-' . $loop->index;
                $items = $section['items'] ?? [];

                // Verifica se algum item da seção está ativo
                $sectionHasActiveItem = false;
                foreach ($items as $item) {
                    if (!empty($item['route_name']) && request()->routeIs($item['route_name'].'*')) {
                        $sectionHasActiveItem = true;
                        break;
                    }
                }
            @endphp

            <div class="mt-3">
                {{-- Cabeçalho da seção como "button" do acordeon --}}
                <button type="button"
                        class="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wide
                               {{ $sectionHasActiveItem ? 'text-[#00b393]' : 'text-gray-500 hover:text-[#00b393]' }}"
                        data-sidebar-section-toggle
                        data-target="{{ $sectionId }}"
                        aria-expanded="{{ $sectionHasActiveItem ? 'true' : 'false' }}">
                    <span class="flex items-center">
                        @if(!empty($section['icon']))
                            <i class="{{ $section['icon'] }} mr-2 text-[12px]"></i>
                        @endif
                        {{ $section['label'] }}
                    </span>

                    {{-- Chevron SVG com rotação animada --}}
                    <span data-sidebar-chevron
                          class="ml-2 h-4 w-4 flex items-center justify-center text-gray-400
                                 transition-transform duration-300 ease-in-out
                                 {{ $sectionHasActiveItem ? 'rotate-90 text-[#00b393]' : '' }}">
                        <svg viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3">
                            <path fill-rule="evenodd"
                                  d="M7.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L10.586 10 7.293 6.707a1 1 0 010-1.414z"
                                  clip-rule="evenodd" />
                        </svg>
                    </span>
                </button>

                {{-- Itens do dropdown (painel do acordeon) --}}
                @if(!empty($items))
                    <ul id="{{ $sectionId }}"
                        class="mt-1 space-y-1 overflow-hidden transition-all duration-700 ease-out
                               {{ $sectionHasActiveItem ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0' }}"
                        data-sidebar-panel>
                        @foreach($items as $item)
                            @php
                                $active = !empty($item['route_name'])
                                    ? request()->routeIs($item['route_name'].'*')
                                    : false;
                            @endphp

                            <li>
                                <a href="{{ !empty($item['route_name']) ? route($item['route_name']) : '#' }}"
                                   class="flex items-center pl-4 pr-3 py-1.5 rounded text-[13px] transition-colors
                                        {{ $active
                                            ? 'bg-[#f0f9f8] text-[#00b393] border-l-4 border-[#00b393] font-medium'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent' }}">
                                    {{ $item['label'] }}
                                </a>
                            </li>
                        @endforeach
                    </ul>
                @endif
            </div>
        @endforeach
    </nav>

    {{-- Rodapé --}}
    <div class="border-t border-gray-100 bg-gray-50/50 px-4 py-4 text-[11px] text-gray-500">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                    {{ substr(Auth::user()->name, 0, 1) }}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 truncate" title="{{ Auth::user()->name }}">{{ Auth::user()->name }}</div>
                    <div class="text-gray-500 truncate" title="{{ Auth::user()->email }}">{{ Auth::user()->email }}</div>
                </div>
            </div>
            <form method="POST" action="{{ route('logout') }}" class="ml-2">
                @csrf
                <button type="submit" class="text-gray-400 hover:text-red-500 transition-colors" title="Sair">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </form>
        </div>
    </div>
</aside>

{{-- Script simples para o acordeon com animação --}}
<script>
    document.addEventListener('DOMContentLoaded', function () {
        const toggles = document.querySelectorAll('[data-sidebar-section-toggle]');

        toggles.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const targetId = btn.getAttribute('data-target');
                const panel = document.getElementById(targetId);
                if (!panel) return;

                const chevron = btn.querySelector('[data-sidebar-chevron]');
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';

                if (isExpanded) {
                    // Fechar
                    btn.setAttribute('aria-expanded', 'false');
                    panel.classList.remove('max-h-64', 'opacity-100');
                    panel.classList.add('max-h-0', 'opacity-0');

                    if (chevron) {
                        chevron.classList.remove('rotate-90', 'text-[#00b393]');
                        chevron.classList.add('text-gray-400');
                    }
                } else {
                    // Abrir
                    btn.setAttribute('aria-expanded', 'true');
                    panel.classList.remove('max-h-0', 'opacity-0');
                    panel.classList.add('max-h-64', 'opacity-100');

                    if (chevron) {
                        chevron.classList.add('rotate-90', 'text-[#00b393]');
                        chevron.classList.remove('text-gray-400');
                    }
                }
            });
        });
    });
</script>
