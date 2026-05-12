{{-- resources/views/users/index.blade.php --}}
<x-app-layout>
    <x-slot name="header">
        Usuários
    </x-slot>

    <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
        <div class="p-6 text-gray-900">
            <div class="flex justify-between mb-4">
                <h3 class="text-lg font-semibold">Listagem de usuários</h3>
                <a href="{{ route('users.create') }}"
                   class="px-4 py-2 bg-indigo-600 text-white rounded text-sm">
                    Novo usuário
                </a>
            </div>

            @if(session('success'))
                <div class="mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded p-3">
                    {{ session('success') }}
                </div>
            @endif

            <table class="min-w-full text-sm">
                <thead>
                <tr class="border-b">
                    <th class="text-left py-2">Nome</th>
                    <th class="text-left py-2">E-mail</th>
                    <th class="text-left py-2">Empresas</th>
                    <th class="text-left py-2">Último acesso</th>
                    <th class="text-center py-2">Status</th>
                    <th class="text-right py-2">Ações</th>
                </tr>
                </thead>
                <tbody>
                @forelse($users as $user)
                    <tr class="border-b">
                        <td class="py-2">{{ $user->name }}</td>
                        <td class="py-2">{{ $user->email }}</td>
                        <td class="py-2">
                            @forelse($user->companies as $company)
                                <span class="inline-block px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                                    {{ $company->name }}
                                </span>
                            @empty
                                <span class="text-xs text-gray-400">Sem empresa</span>
                            @endforelse
                        </td>
                        <td class="py-2 text-xs">
                            {{ $user->last_login_at ? $user->last_login_at->format('d/m/Y H:i') : 'Nunca' }}
                        </td>
                        <td class="py-2 text-center">
                            @if($user->is_active)
                                <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                    Ativo
                                </span>
                            @else
                                <span class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                                    Bloqueado
                                </span>
                            @endif
                        </td>
                        <td class="py-2 text-right space-x-1">
                            <a href="{{ route('users.edit', $user) }}"
                               class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                Editar
                            </a>

                            <form action="{{ route('users.toggle-active', $user) }}"
                                  method="POST" class="inline">
                                @csrf
                                <button type="submit"
                                        class="text-xs px-2 py-1 rounded
                                        {{ $user->is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200' }}">
                                    {{ $user->is_active ? 'Bloquear' : 'Desbloquear' }}
                                </button>
                            </form>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="py-4 text-center text-sm text-gray-500">
                            Nenhum usuário encontrado.
                        </td>
                    </tr>
                @endforelse
                </tbody>
            </table>

            <div class="mt-4">
                {{ $users->links() }}
            </div>
        </div>
    </div>
</x-app-layout>
