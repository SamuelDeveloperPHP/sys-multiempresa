<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\Request;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $categorySlug = $request->query('categoria');
        $tagSlug      = $request->query('tag');

        $postsQuery = Post::with(['author', 'category', 'tags', 'company'])
            ->published()
            ->latest('published_at');

        // 🔹 Multiempresa: O filtro agora é automático via Global Scope (PostCompanyScope)

        // 🔹 Filtro por categoria
        if ($categorySlug) {
            $postsQuery->whereHas('category', function ($q) use ($categorySlug) {
                $q->where('slug', $categorySlug);
            });
        }

        // 🔹 Filtro por tag (slug)
        if ($tagSlug) {
            $postsQuery->whereHas('tags', function ($q) use ($tagSlug) {
                $q->where('slug', $tagSlug);
            });
        }

        $posts = $postsQuery->paginate(6)->withQueryString();

        $categories = Category::with('children')
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get();

        $tags = Tag::orderBy('name')->get();

        return view('blog.index', [
            'posts'        => $posts,
            'categories'   => $categories,
            'tags'         => $tags,
            'categorySlug' => $categorySlug,
            'tagSlug'      => $tagSlug,
        ]);
    }

    public function show(string $slug)
    {
        $postQuery = Post::with(['author', 'category', 'tags', 'company'])
            ->published()
            ->where('slug', $slug);

        $post = $postQuery->firstOrFail();

        $related = Post::published()
            ->where('id', '<>', $post->id)
            ->where('category_id', $post->category_id)
            ->latest('published_at')
            ->take(3)
            ->get();

        $categories = Category::with('children')
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get();

        return view('blog.show', compact('post', 'related', 'categories'));
    }
}
