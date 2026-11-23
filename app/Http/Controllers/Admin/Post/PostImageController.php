<?php

namespace App\Http\Controllers\Admin\Post;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            $filename = Str::uuid() . '.' . $file->extension();
            $file->move($basePath, $filename);

            $post->images()->create([
                'path'       => "assets/image/post/{$post->id}/{$filename}",
                'sort_order' => $nextOrder,
            ]);

            $nextOrder += 10;
        }

        return back()->with('success', 'Imagens enviadas com sucesso.');
    }

    public function order(Request $request, Post $post)
    {
        $data = $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer|min:0|max:4294967295',
        ]);

        // order = [imageId => sort_order]
        DB::transaction(function () use ($post, $data) {
            $positions = $data['order'];
            $images = $post->images()->whereIntegerInRaw('id', array_keys($positions))->lockForUpdate()->get();
            abort_unless($images->count() === count($positions), 404);
            foreach ($images as $image) {
                abort_unless(array_key_exists($image->id, $positions), 404);
                $image->update(['sort_order' => $positions[$image->id]]);
            }
        });

        return back()->with('success', 'Ordem atualizada.');
    }

    public function cover(Request $request, Post $post)
    {
        $request->validate([
            'image_id' => 'required|integer',
        ]);

        $imageId = (int) $request->input('image_id');

        DB::transaction(function () use ($post, $imageId) {
            Post::query()->lockForUpdate()->findOrFail($post->id);
            $image = $post->images()->lockForUpdate()->findOrFail($imageId);
            $post->images()->where('id', '!=', $image->id)->where('is_cover', true)->update(['is_cover' => false]);
            $post->images()->whereKey($image->id)->update(['is_cover' => true]);
        });

        return back()->with('success', 'Capa definida.');
    }

    public function destroy(Post $post, PostImage $image)
    {
        // garante que a imagem é do post
        abort_unless($image->post_id === $post->id, 404);

        $relative = "assets/image/post/{$post->id}/" . basename($image->path);
        if ($image->path === $relative && File::isFile(public_path($relative))) {
            File::delete(public_path($relative));
        }

        $image->delete();

        return back()->with('success', 'Imagem removida.');
    }
}
