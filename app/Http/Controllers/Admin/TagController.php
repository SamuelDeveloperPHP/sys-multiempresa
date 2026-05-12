<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TagController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Tag::orderBy('name');

            if ($search = $request->input('q')) {
                $query->where('name', 'like', "%{$search}%");
            }

            $tags = $query->paginate(20)->withQueryString();

            return \Inertia\Inertia::render('Admin/Blog/Tags/Index', [
                'tags'    => $tags,
                'filters' => $request->only('q'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao listar tags do blog', [
                'msg'  => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao listar tags. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function create()
    {
        try {
            return \Inertia\Inertia::render('Admin/Blog/Tags/Create');
        } catch (\Throwable $e) {
            Log::error('Erro ao carregar formulário de criação de tag', [
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
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255|unique:tags,slug',
            ]);

            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            Tag::create($data);

            return redirect()
                ->route('admin.blog.tags.index')
                ->with('success', 'Tag criada com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao criar tag do blog', [
                'msg'  => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao criar tag. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function edit(Tag $tag)
    {
        try {
            return \Inertia\Inertia::render('Admin/Blog/Tags/Edit', ['tag' => $tag]);
        } catch (\Throwable $e) {
            Log::error('Erro ao carregar edição de tag', [
                'tag_id' => $tag->id ?? null,
                'msg'    => $e->getMessage(),
                'file'   => $e->getFile(),
                'line'   => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao carregar formulário. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }

    public function update(Request $request, Tag $tag)
    {
        try {
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255|unique:tags,slug,' . $tag->id,
            ]);

            if (empty($data['slug'])) {
                $data['slug'] = Str::slug($data['name']);
            }

            $tag->update($data);

            return redirect()
                ->route('admin.blog.tags.index')
                ->with('success', 'Tag atualizada com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao atualizar tag do blog', [
                'tag_id' => $tag->id ?? null,
                'msg'    => $e->getMessage(),
                'file'   => $e->getFile(),
                'line'   => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()
                ->withInput()
                ->withErrors([
                    'error' => "Falha ao atualizar tag. Erro: {$short} (linha {$e->getLine()})",
                ]);
        }
    }

    public function destroy(Tag $tag)
    {
        try {
            // se quiser, pode impedir exclusão se tiver posts vinculados:
            // if ($tag->posts()->exists()) { ... }

            $tag->delete();

            return redirect()
                ->route('admin.blog.tags.index')
                ->with('success', 'Tag removida com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao remover tag do blog', [
                'tag_id' => $tag->id ?? null,
                'msg'    => $e->getMessage(),
                'file'   => $e->getFile(),
                'line'   => $e->getLine(),
            ]);

            $short = mb_substr($e->getMessage(), 0, 120);

            return back()->withErrors([
                'error' => "Falha ao remover tag. Erro: {$short} (linha {$e->getLine()})",
            ]);
        }
    }
}
