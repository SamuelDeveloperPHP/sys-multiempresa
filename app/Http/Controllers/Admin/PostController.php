<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use App\Models\Post;
use App\Models\PostImage;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Throwable;

class PostController extends Controller
{
    public function index(Request $request)
    {
        try {
            $company = CompanyContext::current();
            $user    = Auth::user();

            $query = Post::query()
                ->with(['author', 'category', 'companies']);

            /**
             * 🔐 REGRA DE VISIBILIDADE POR EMPRESA
             *
             * - Super admin → vê tudo
             * - Demais usuários →
             *      • posts sem vínculo com empresa (globais)
             *      • OU posts vinculados à empresa atual
             */
            if ($company && $user?->type !== 'super_admin') {
                $query->where(function ($q) use ($company) {
                    $q->whereDoesntHave('companies')
                        ->orWhereHas('companies', function ($q2) use ($company) {
                            $q2->where('companies.id', $company->id);
                        });
                });
            }

            /**
             * 🔍 FILTROS
             */
            if ($search = $request->input('q')) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            }

            if ($categoryId = $request->input('category_id')) {
                $query->where('category_id', $categoryId);
            }

            if ($status = $request->input('status')) {
                match ($status) {
                    'published' => $query->published(),
                    'draft'     => $query->where('is_published', false),
                    default     => null,
                };
            }

            /**
             * 📄 ORDENAÇÃO + PAGINAÇÃO
             */
            $posts = $query
                ->orderByDesc('published_at')
                ->orderByDesc('created_at')
                ->paginate(10)
                ->withQueryString();

            $categories = Category::orderBy('name')->get();
            $filters    = $request->only(['q', 'category_id', 'status']);

            return \Inertia\Inertia::render('Admin/Posts/Index', [
                'posts'      => $posts,
                'categories' => $categories,
                'filters'    => $filters
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao listar posts', [
                'filtros' => $request->all(),
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao listar posts. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }


    public function create()
    {
        try {
            $companies  = Company::orderBy('name')->get();
            $categories = Category::orderBy('name')->get();
            $tags = Tag::orderBy('name')->get();

            return \Inertia\Inertia::render('Admin/Posts/Create', [
                'companies'  => $companies,
                'categories' => $categories,
                'tags'       => $tags
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao carregar formulário de novo post', [
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
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
                'title'        => 'required|string|max:255',
                'description'  => 'nullable|string',
                'content'      => 'required|string',
                'category_id'  => 'nullable|exists:categories,id',
                'is_published' => 'boolean',
                'published_at' => 'nullable|date',
                'companies'    => 'array',
                'companies.*'  => 'exists:companies,id',

                // Galeria de imagens
                'images'       => 'array',
                'images.*'     => 'image|max:10240', // <= 10MB por imagem
            ]);

            $user = Auth::user();

            $post = new Post();
            $post->user_id      = $user->id;
            $post->category_id  = $data['category_id'] ?? null;
            $post->title        = $data['title'];
            $post->description  = $data['description'] ?? null;
            $post->content      = $data['content'];
            $post->is_published = $request->boolean('is_published');
            $post->published_at = $data['published_at'] ?? null;

            if ($post->is_published && empty($post->published_at)) {
                $post->published_at = now();
            }

            // slug
            $post->slug = Str::slug($post->title) . '-' . Str::random(5);

            $post->save();

            // Vincula empresas
            $companyIds = $data['companies'] ?? [];
            if (!empty($companyIds)) {
                $post->companies()->sync($companyIds);
            }

            // Salva galeria de imagens
            if ($request->hasFile('images')) {
                $this->storePostImages($request, $post);
            }

            return redirect()
                ->route('admin.posts.index')
                ->with('success', 'Post criado com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao criar post', [
                'dados' => $request->all(),
                'msg'   => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao criar post. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function show(Post $post)
    {
        try {
            $post->load(['author', 'category', 'companies', 'images', 'tags']);

            return \Inertia\Inertia::render('Admin/Posts/Show', ['post' => $post]);
        } catch (Throwable $e) {
            Log::error('Erro ao exibir post', [
                'post_id' => $post->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao exibir post. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function edit(Post $post)
    {
        try {

            $post->load(['companies', 'images', 'tags']);

            $companies  = Company::orderBy('name')->get();
            $categories = Category::orderBy('name')->get();
            $tags       = Tag::orderBy('name')->get();

            $selectedCompanies = $post->company->pluck('id')->toArray();

            return \Inertia\Inertia::render('Admin/Posts/Edit', [
                'post'              => $post,
                'companies'         => $companies,
                'categories'        => $categories,
                'tags'              => $tags,
                'selectedCompanies' => $selectedCompanies
            ]);
        } catch (Throwable $e) {

            Log::error('Erro ao carregar edição de post', [
                'post_id' => $post->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function update(Request $request, Post $post)
    {
        try {
            $data = $request->validate([
                'title'        => 'required|string|max:255',
                'description'  => 'nullable|string|max:500',
                'content'      => 'required|string',
                'category_id'  => 'nullable|exists:categories,id',
                'is_published' => 'boolean',
                'published_at' => 'nullable|date',
                'companies'    => 'array',
                'companies.*'  => 'exists:companies,id',

                'images'       => 'array',
                'images.*'     => 'image|max:1024',
            ]);

            $post->category_id  = $data['category_id'] ?? null;
            $post->title        = $data['title'];
            $post->description  = $data['description'] ?? null;
            $post->content      = $data['content'];
            $post->is_published = $request->boolean('is_published');
            $post->published_at = $data['published_at'] ?? $post->published_at;

            if ($post->is_published && empty($post->published_at)) {
                $post->published_at = now();
            }

            $post->save();

            // Empresas
            $companyIds = $data['companies'] ?? [];
            $post->companies()->sync($companyIds);

            // Novas imagens (mantém as antigas)
            if ($request->hasFile('images')) {
                $this->storePostImages($request, $post);
            }

            return redirect()
                ->route('admin.posts.index')
                ->with('success', 'Post atualizado com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao atualizar post', [
                'post_id' => $post->id ?? null,
                'dados'   => $request->all(),
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao atualizar post. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function destroy(Post $post)
    {
        try {
            // Apaga imagens do disco
            foreach ($post->images as $image) {
                if ($image->path && Storage::disk('public')->exists($image->path)) {
                    Storage::disk('public')->delete($image->path);
                }
            }

            $post->delete();

            return redirect()
                ->route('admin.posts.index')
                ->with('success', 'Post removido com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao remover post', [
                'post_id' => $post->id ?? null,
                'msg'     => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao remover post. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    /**
     * Salva imagens enviadas no formulário em storage/public/posts/{post_id}
     * e cria registros em post_images.
     */
    protected function storePostImages(Request $request, Post $post, bool $replace = false): void
    {
        $basePath = public_path("assets/image/post/{$post->id}");

        // cria pasta se não existir
        if (!File::exists($basePath)) {
            File::makeDirectory($basePath, 0755, true);
        }

        // 🔥 se for update com replace, apaga tudo antes
        if ($replace) {
            foreach ($post->images as $image) {
                $filePath = $basePath . '/' . $image->filename;
                if (File::exists($filePath)) {
                    File::delete($filePath);
                }
                $image->delete();
            }
        }

        foreach ($request->file('images') as $file) {

            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();

            // move para public/assets/image/post/{id}
            $file->move($basePath, $filename);

            // salva no banco
            $post->images()->create([
                'filename' => $filename,
                'path'     => "assets/image/post/{$post->id}/{$filename}",
            ]);
        }
    }
}
