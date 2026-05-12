<x-app-layout>
    <div class="max-w-4xl mx-auto py-8">
        <h1 class="text-2xl font-bold mb-4">Dashboard</h1>

        @if($currentCompany)
            <p class="mb-4">
                <span class="font-semibold">Empresa atual:</span>
                {{ $currentCompany->name }}
            </p>
        @else
            <p class="mb-4 text-red-600">
                Nenhuma empresa selecionada.
                <a href="{{ route('companies.select') }}" class="underline">
                    Clique aqui para selecionar.
                </a>
            </p>
        @endif

        <div class="bg-white rounded shadow p-4">
            <h2 class="font-semibold mb-2">Minhas empresas</h2>
            <ul class="list-disc list-inside text-sm">
                @forelse($companies as $company)
                    <li>{{ $company->name }}</li>
                @empty
                    <li>Você ainda não possui empresas cadastradas.</li>
                @endforelse
            </ul>
        </div>
    </div>
</x-app-layout>
