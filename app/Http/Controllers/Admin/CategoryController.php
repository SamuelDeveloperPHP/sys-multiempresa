<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
       // dd('chegou aqui');
        try {
            $query = Category::with('parent')
                ->orderBy('parent_id')
                ->orderBy('name');

            if ($search = $request->input('q')) {
                $query->where('name', 'like', "%{$search}%");
            }

            $categories = $query->paginate(15)->withQueryString();

            return \Inertia\Inertia::render('Admin/Blog/Categories/Index', [
                'categories' => $categories,
                'filters'    => $request->only('q'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao listar categorias do blog', [
                'msg'  => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao listar categorias. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function create()
    {
        try {
            // pais possíveis = categorias raiz
            $parents = Category::whereNull('parent_id')
                ->orderBy('name')
                ->get();

            return \Inertia\Inertia::render('Admin/Blog/Categories/Create', ['parents' => $parents]);
        } catch (\Throwable $e) {
            Log::error('Erro ao carregar formulário de cadastro de categoria', [
                'msg'  => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'name'      => 'required|string|max:255',
                'slug'      => 'nullable|string|max:255|unique:categories,slug',
                'parent_id' => 'nullable|exists:categories,id',
            ]);

            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            Category::create([
                'name'      => $data['name'],
                'slug'      => $data['slug'],
                'parent_id' => $data['parent_id'] ?? null,
            ]);

            return redirect()
                ->route('admin.blog.categories.index')
                ->with('success', 'Categoria criada com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao criar categoria do blog', [
                'msg'  => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao criar categoria. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function edit(Category $category)
    {
        try {
            $parents = Category::whereNull('parent_id')
                ->where('id', '<>', $category->id) // não pode ser pai de si mesma
                ->orderBy('name')
                ->get();

            return \Inertia\Inertia::render('Admin/Blog/Categories/Edit', ['category' => $category, 'parents' => $parents]);
        } catch (\Throwable $e) {
            Log::error('Erro ao carregar edição de categoria', [
                'category_id' => $category->id ?? null,
                'msg'         => $e->getMessage(),
                'file'        => $e->getFile(),
                'line'        => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function update(Request $request, Category $category)
    {
        try {
            $data = $request->validate([
                'name'      => 'required|string|max:255',
                'slug'      => 'nullable|string|max:255|unique:categories,slug,' . $category->id,
                'parent_id' => 'nullable|exists:categories,id',
            ]);

            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            // evitar ser filha de si mesma
            if (!empty($data['parent_id']) && (int)$data['parent_id'] === (int)$category->id) {
                return back()
                    ->withInput()
                    ->withErrors(['error' => 'Uma categoria não pode ser pai dela mesma.']);
            }

            $category->update([
                'name'      => $data['name'],
                'slug'      => $data['slug'],
                'parent_id' => $data['parent_id'] ?? null,
            ]);

            return redirect()
                ->route('admin.blog.categories.index')
                ->with('success', 'Categoria atualizada com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao atualizar categoria do blog', [
                'category_id' => $category->id ?? null,
                'msg'         => $e->getMessage(),
                'file'        => $e->getFile(),
                'line'        => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao atualizar categoria. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function destroy(Category $category)
    {
        try {
            // bloqueia exclusão se houver subcategorias
            $hasChildren = Category::where('parent_id', $category->id)->exists();
            if ($hasChildren) {
                return back()->withErrors([
                    'error' => 'Não é possível excluir uma categoria que possui subcategorias.',
                ]);
            }

            // bloqueia exclusão se houver posts
            $hasPosts = Post::where('category_id', $category->id)->exists();
            if ($hasPosts) {
                return back()->withErrors([
                    'error' => 'Não é possível excluir uma categoria que possui posts vinculados.',
                ]);
            }

            $category->delete();

            return redirect()
                ->route('admin.blog.categories.index')
                ->with('success', 'Categoria removida com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao remover categoria do blog', [
                'category_id' => $category->id ?? null,
                'msg'         => $e->getMessage(),
                'file'        => $e->getFile(),
                'line'        => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao remover categoria. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }
}
