{{-- resources/views/users/_form.blade.php --}}
@csrf

<div class="space-y-4">
    <div>
        <label class="block text-sm font-medium text-gray-700">Nome</label>
        <input type="text" name="name" value="{{ old('name', $user->name ?? '') }}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
    </div>

    <div>
        <label class="block text-sm font-medium text-gray-700">E-mail</label>
        <input type="email" name="email" value="{{ old('email', $user->email ?? '') }}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
    </div>

    <div>
        <label class="block text-sm font-medium text-gray-700">Senha
            <span class="text-xs text-gray-400">(mín. 8 caracteres)</span>
        </label>
        <input type="password" name="password" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
        @if(!empty($user))
            <p class="text-xs text-gray-400 mt-1">Deixe em branco para manter a senha atual.</p>
        @endif
    </div>

    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Empresas</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            @foreach($companies as $company)
                <label class="flex items-center text-sm">
                    <input type="checkbox" name="companies[]" value="{{ $company->id }}"
                           class="mr-2"
                           @checked(in_array($company->id, old('companies', $selectedCompanies ?? [])))>
                    {{ $company->name }}
                </label>
            @endforeach
        </div>
    </div>

    <div class="flex justify-end">
        <button type="submit"
                class="px-4 py-2 bg-indigo-600 text-white text-sm rounded">
            Salvar
        </button>
    </div>
</div>
