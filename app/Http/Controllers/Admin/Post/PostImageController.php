<?php

namespace App\Http\Controllers\Admin\Post;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class PostImageController extends Controller
{
    public function store(Request $request, Post $post)
    {
        $request->validate([
            'images'   => 'required|array',
            'images.*' => 'image|max:1024',
        ]);

        $basePath = public_path("assets/image/post/{$post->id}");
        if (!File::exists($basePath)) File::makeDirectory($basePath, 0755, true);

        $maxOrder = (int) $post->images()->max('sort_order');
        $nextOrder = $maxOrder + 10;

        foreach ($request->file('images') as $file) {
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $file->move($basePath, $filename);

            $post->images()->create([
                'filename'   => $filename,
                'path'       => "assets/image/post/{$post->id}/{$filename}",
                'sort_order' => $nextOrder,
            ]);

            $nextOrder += 10;
        }

        return back()->with('success', 'Imagens enviadas com sucesso.');
    }

    public function order(Request $request, Post $post)
    {
        $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer',
        ]);

        // order = [imageId => sort_order]
        foreach ($request->input('order') as $imageId => $sort) {
            $post->images()->where('id', $imageId)->update(['sort_order' => (int) $sort]);
        }

        return back()->with('success', 'Ordem atualizada.');
    }

    public function cover(Request $request, Post $post)
    {
        $request->validate([
            'image_id' => 'required|integer',
        ]);

        $imageId = (int) $request->input('image_id');

        $post->images()->update(['is_cover' => false]);
        $post->images()->where('id', $imageId)->update(['is_cover' => true]);

        return back()->with('success', 'Capa definida.');
    }

    public function destroy(Post $post, PostImage $image)
    {
        // garante que a imagem é do post
        abort_unless($image->post_id === $post->id, 404);

        $filePath = public_path("assets/image/post/{$post->id}/{$image->filename}");
        if (File::exists($filePath)) File::delete($filePath);

        $image->delete();

        return back()->with('success', 'Imagem removida.');
    }
}
