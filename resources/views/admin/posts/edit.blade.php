<x-app-layout>
    <div class="max-w-7xl mx-auto mt-8 space-y-8 px-6">

        <h1 class="text-2xl font-bold mb-4">Editar Post</h1>

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

        <form method="POST" action="{{ route('admin.posts.update', $post) }}" enctype="multipart/form-data"
            class="space-y-6">
            @csrf
            @method('PUT')

            {{-- CARD DADOS DO POST --}}
            <div class="bg-white shadow-sm rounded-lg p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium">Título</label>
                    <input type="text" name="title" value="{{ old('title', $post->title) }}"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>

                <div>
                    <label class="block text-sm font-medium">Descrição (resumo)</label>
                    <textarea name="description" rows="2"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">{{ old('description', $post->description) }}</textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium">Categoria</label>
                    <select name="category_id"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">Selecione</option>
                        @foreach ($categories as $cat)
                            <option value="{{ $cat->id }}" @selected(old('category_id', $post->category_id) == $cat->id)>
                                {{ $cat->name }}
                            </option>
                        @endforeach
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium">Conteúdo</label>
                    <textarea name="content" rows="8"
                        class="mt-1 w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">{{ old('content', $post->content) }}</textarea>
                </div>

                <div class="flex items-center gap-2">
                    <input type="checkbox" name="is_published" value="1"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        {{ old('is_published', $post->is_published) ? 'checked' : '' }}>
                    <span class="text-sm">Publicado</span>
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
                                @checked(collect(old('companies', $selectedCompanies))->contains($company->id))>
                            <span>{{ $company->name }}</span>
                        </label>
                    @endforeach
                </div>
            </div>

            {{-- CARD GALERIA DE IMAGENS --}}
            <div class="bg-white shadow-sm rounded-lg p-6 space-y-4">
                <h2 class="text-sm font-semibold text-gray-700">Galeria de imagens</h2>

                @if ($post->images->isNotEmpty())
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-4">

                        @foreach ($post->images as $image)
                            <div class="border rounded-md overflow-hidden bg-white">
                                <div class="relative">
                                    <img src="{{ asset($image->path) }}" alt=""
                                        class="w-full h-40 object-cover">

                                    {{-- badge capa --}}
                                    @if ($image->is_cover)
                                        <span
                                            class="absolute top-2 left-2 text-[10px] bg-indigo-600 text-white px-2 py-1 rounded">
                                            CAPA
                                        </span>
                                    @endif
                                </div>

                                <div class="p-3 space-y-3">
                                    {{-- ordem --}}
                                    <div class="flex items-center gap-2">
                                        <label class="text-[11px] text-gray-600 w-12">Ordem</label>
                                        <input type="number" min="0"
                                            name="images_meta[{{ $image->id }}][sort_order]"
                                            value="{{ old("images_meta.{$image->id}.sort_order", $image->sort_order) }}"
                                            class="w-full border rounded-md px-2 py-1 text-xs">
                                    </div>

                                    {{-- alt (opcional) --}}
                                    <div>
                                        <input type="text" name="images_meta[{{ $image->id }}][alt_text]"
                                            value="{{ old("images_meta.{$image->id}.alt_text", $image->alt_text) }}"
                                            placeholder="Alt/Legenda (opcional)"
                                            class="w-full border rounded-md px-2 py-1 text-xs">
                                    </div>

                                    {{-- ações --}}
                                    <div class="flex items-center justify-between gap-2">
                                        <label class="text-[11px] text-gray-600 flex items-center gap-2">
                                            <input type="radio" name="cover_image_id" value="{{ $image->id }}"
                                                class="h-4 w-4 text-indigo-600"
                                                {{ old('cover_image_id', $post->images->firstWhere('is_cover', true)?->id) == $image->id ? 'checked' : '' }}>
                                            Capa
                                        </label>

                                        <label class="text-[11px] text-red-600 flex items-center gap-2">
                                            <input type="checkbox" name="delete_images[]" value="{{ $image->id }}"
                                                class="h-4 w-4">
                                            Remover
                                        </label>
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <p class="text-[11px] text-gray-500">Nenhuma imagem enviada ainda.</p>
                @endif

                <p class="text-[11px] text-gray-500">
                    Envie novas imagens para adicionar à galeria. Cada imagem deve ter no máximo 1 MB.
                </p>

                <input type="file" name="images[]" multiple
                    class="block w-full text-sm text-gray-700
                            file:mr-3 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100">
            </div>


            <div class="flex justify-between">
                <a href="{{ route('admin.posts.index') }}" class="text-sm text-gray-500 bg-warning-600 hover:text-gray-700">
                    Voltar
                </a>

                <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-semibold">
                    Salvar alterações
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
