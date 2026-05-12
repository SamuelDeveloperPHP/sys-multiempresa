{{-- resources/views/users/edit.blade.php --}}
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            Editar usuário
        </h2>
    </x-slot>

    <div class="py-6">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 flex gap-4">

            <div class="bg-white shadow-sm sm:rounded-lg flex-1">
                <div class="p-6 text-gray-900">
                    <form action="{{ route('users.update', $user) }}" method="POST">
                        @method('PUT')
                        @include('users._form')
                    </form>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
