<x-app-layout>
    <div class="max-w-4xl mx-auto mt-8 space-y-6">

        <h1 class="text-2xl font-bold mb-4">Novo Post</h1>

        {{-- ALERTAS --}}
        @if ($errors->has('error'))
            <div class="mb-4 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                {{ $errors->first('error') }}
            </div>
        @endif

        @if ($errors->any() && !$errors->has('error'))
            <div class="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
                <p class="text-sm text-red-800 font-semibold">Ops! Verifique os campos abaixo.</p>
            </div>
        @endif

        <form method="POST" action="{{ route('admin.posts.store') }}" enctype="multipart/form-data" class="space-y-6">
            @csrf

            {{-- CARD DADOS DO POST --}}
            <div class="bg-white shadow-sm rounded-lg p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium">Título</label>
                    <input type="text" name="title" value="{{ old('title') }}"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>

                <div>
                    <label class="block text-sm font-medium">Descrição (resumo)</label>
                    <textarea name="description" rows="2"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">{{ old('description') }}</textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium">Categoria</label>
                    <select name="category_id"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">Selecione</option>
                        @foreach ($categories as $cat)
                            <option value="{{ $cat->id }}" @selected(old('category_id') == $cat->id)>
                                {{ $cat->name }}
                            </option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium">Conteúdo</label>
                    <textarea name="content" rows="12"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">{{ old('content') }}</textarea>
                </div>

                <div class="flex items-center gap-2">
                    <input type="checkbox" name="is_published" value="1"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        {{ old('is_published', 0) ? 'checked' : '' }}>
                    <span class="text-sm">Publicar imediatamente</span>
                </div>
            </div>

            {{-- CARD EMPRESAS --}}
            <div class="bg-white shadow-sm rounded-lg p-6 space-y-3">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-sm font-semibold text-gray-700">Empresas</h2>
                    <label class="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" id="check-all-companies"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <span>Selecionar todas</span>
                    </label>
                </div>

                <div class="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1 bg-gray-50">
                    @foreach ($companies as $company)
                        <label class="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="companies[]" value="{{ $company->id }}"
                                class="company-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                @checked(collect(old('companies', []))->contains($company->id))>
                            <span>{{ $company->name }}</span>
                        </label>
                    @endforeach
                </div>
            </div>

            {{-- CARD GALERIA DE IMAGENS --}}
            <div class="bg-white shadow-sm rounded-lg p-6 space-y-3">
                <h2 class="text-sm font-semibold text-gray-700">Galeria de imagens</h2>
                <p class="text-[11px] text-gray-500 mb-2">
                    Você pode enviar várias imagens. Cada imagem deve ter no máximo 1 MB.
                </p>

                <input type="file" name="images[]" multiple
                    class="block w-full text-sm text-gray-700
                           file:mr-3 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-semibold
                           file:bg-indigo-50 file:text-indigo-700
                           hover:file:bg-indigo-100">
            </div>

            <div class="flex justify-end">
                <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-semibold">
                    Salvar
                </button>
            </div>
        </form>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const checkAll = document.getElementById('check-all-companies');
            const boxes = document.querySelectorAll('.company-checkbox');

            if (checkAll) {
                checkAll.addEventListener('change', function() {
                    boxes.forEach(b => b.checked = checkAll.checked);
                });
            }
        });
    </script>
</x-app-layout>
