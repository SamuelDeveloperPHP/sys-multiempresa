<?php

namespace Tests\Feature\Admin;

use App\Models\Company;
use App\Models\Module;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Frota\AdminFrotaTestCase;

class PostGalleryAuthorizationTest extends AdminFrotaTestCase
{
    private Company $company;
    private Post $post;
    private PostImage $cover;

    protected function setUp(): void
    {
        parent::setUp();
        $disk = Storage::fake('gallery-'.getmypid());
        $this->app->usePublicPath($disk->path(''));
        $this->company = $this->criarEmpresa();
        $this->post = $this->publication($this->company);
        $path = "assets/image/post/{$this->post->id}/capa.png";
        $this->cover = $this->post->images()->create(['path' => $path, 'sort_order' => 10]);
        $this->cover->forceFill(['is_cover' => true])->save();
        $disk->put($path, 'capa original');
    }

    private function publication(Company $company): Post
    {
        $post = Post::create(['title' => 'Publicação de teste']);
        $post->companies()->attach($company->id);
        return $post;
    }

    private function loginWith(array $abilities): void
    {
        $user = $this->criarUsuario($this->company, 'user');
        $permission = $this->concederPermissao($user, $this->company, 'admin.posts.index', $abilities);
        $permission->module->update(['slug' => 'blog_posts']);
        $this->comContexto($user, $this->company);
    }

    private function attemptAll(Post $post, int $status): void
    {
        $this->post(route('admin.posts.images.store', $post), [
            'images' => [UploadedFile::fake()->image('nova.png')],
        ])->assertStatus($status);
        $this->patch(route('admin.posts.images.order', $post), ['order' => [$this->cover->id => 90]])->assertStatus($status);
        $this->patch(route('admin.posts.images.cover', $post), ['image_id' => $this->cover->id])->assertStatus($status);
        $this->delete(route('admin.posts.images.destroy', [$post, $this->cover]))->assertStatus($status);
        $this->assertOriginalGallery();
    }

    private function assertOriginalGallery(): void
    {
        $this->assertDatabaseCount('post_images', 1);
        $this->assertEquals(10, $this->cover->refresh()->sort_order);
        $this->assertTrue((bool) $this->cover->is_cover);
        $disk = Storage::disk('gallery-'.getmypid());
        $this->assertSame([$this->cover->path], $disk->allFiles());
        $this->assertSame('capa original', $disk->get($this->cover->path));
    }

    public function test_reader_cannot_change_gallery(): void
    {
        $this->loginWith(['list', 'view']);
        // Editar o menu pai não concede edição das publicações.
        auth()->user()->modulePermissions()->create([
            'module_id' => Module::where('slug', 'blog')->firstOrFail()->id,
            'company_id' => $this->company->id, 'can_edit' => true,
        ]);
        $this->attemptAll($this->post, 403);
    }

    public function test_editor_cannot_change_publication_from_another_company(): void
    {
        $foreign = $this->publication($this->criarEmpresa());
        $this->loginWith(['edit']);
        $this->attemptAll($foreign, 404);
    }

    public function test_editor_cannot_mix_images_from_two_publications(): void
    {
        $second = $this->publication($this->company);
        $other = $second->images()->create(['path' => 'other.png', 'sort_order' => 20]);
        $this->loginWith(['edit']);
        $this->patch(route('admin.posts.images.order', $this->post), [
            'order' => [$this->cover->id => 30, $other->id => 5],
        ])->assertNotFound();
        $this->patch(route('admin.posts.images.cover', $this->post), ['image_id' => $other->id])->assertNotFound();
        $this->delete(route('admin.posts.images.destroy', [$second, $this->cover]))->assertNotFound();
        $this->assertEquals(10, $this->cover->refresh()->sort_order);
        $this->assertTrue((bool) $this->cover->is_cover);
        $this->assertEquals(20, $other->refresh()->sort_order);
        Storage::disk('gallery-'.getmypid())->assertExists($this->cover->path);
    }

    public function test_editor_can_manage_gallery_of_authorized_publication(): void
    {
        $this->loginWith(['edit']);
        $this->post(route('admin.posts.images.store', $this->post), [
            'images' => [UploadedFile::fake()->image('nova.png')],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $new = $this->post->images()->where('id', '!=', $this->cover->id)->sole();
        Storage::disk('gallery-'.getmypid())->assertExists($new->path);
        $this->patch(route('admin.posts.images.order', $this->post), ['order' => [$new->id => 1]])->assertRedirect();
        $this->assertEquals(1, $new->refresh()->sort_order);
        $this->patch(route('admin.posts.images.cover', $this->post), ['image_id' => $new->id])->assertRedirect();
        $this->assertTrue((bool) $new->refresh()->is_cover);
        $this->assertFalse((bool) $this->cover->refresh()->is_cover);
        $this->delete(route('admin.posts.images.destroy', [$this->post, $new]))->assertRedirect();
        $this->assertDatabaseMissing('post_images', ['id' => $new->id]);
        Storage::disk('gallery-'.getmypid())->assertMissing($new->path);
    }
}
