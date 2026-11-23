<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Corrige dois problemas na tabela modules:
 *
 * 1. parent_id e id_modulo_relacionamento eram NOT NULL com default 0.
 *    O ViewServiceProvider usa Collection::where('parent_id', null) — em PHP,
 *    0 == null (loose), então todos os módulos apareciam como raiz e
 *    nenhum como filho, quebrando o menu lateral.
 *
 * 2. Aplica a hierarquia real: cria módulo-pai "Blog" e vincula
 *    blog-posts, blog-categories e blog-tags a ele.
 *    Módulos users-active, users-inactive e users-permissions
 *    são vinculados ao módulo "users".
 */
return new class extends Migration
{
    public function up(): void
    {
        // ----------------------------------------------------------------
        // 1. Torna parent_id e id_modulo_relacionamento nullable
        // ----------------------------------------------------------------
        Schema::table('modules', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_id')->nullable()->default(null)->change();
            $table->unsignedBigInteger('id_modulo_relacionamento')->nullable()->default(null)->change();
        });

        // ----------------------------------------------------------------
        // 2. Converte 0 → NULL (raiz real)
        // ----------------------------------------------------------------
        DB::table('modules')->where('parent_id', 0)->update(['parent_id' => null]);
        DB::table('modules')->where('id_modulo_relacionamento', 0)->update(['id_modulo_relacionamento' => null]);

        // ----------------------------------------------------------------
        // 3. Cria módulo-pai "Blog" se não existir
        // ----------------------------------------------------------------
        $blogParent = DB::table('modules')->where('slug', 'blog')->first();

        if (! $blogParent) {
            $blogParentId = DB::table('modules')->insertGetId([
                'slug'                    => 'blog',
                'name'                    => 'Blog',
                'route_name'              => 'admin.posts.index',
                'icon'                    => 'fa-solid fa-newspaper',
                'parent_id'               => null,
                'id_modulo_relacionamento'=> null,
                'url'                     => null,
                'ordem'                   => 100,
                'is_active'               => 1,
                'show_in_menu'            => 1,
                'sort_order'              => 100,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]);
        } else {
            $blogParentId = $blogParent->id;
        }

        // ----------------------------------------------------------------
        // 4. Vincula filhos do Blog ao pai
        // ----------------------------------------------------------------
        DB::table('modules')
            ->whereIn('slug', ['blog-posts', 'blog_posts'])
            ->update(['parent_id' => $blogParentId, 'show_in_menu' => 1]);

        DB::table('modules')
            ->whereIn('slug', ['blog-categories', 'blog_categories'])
            ->update(['parent_id' => $blogParentId, 'show_in_menu' => 1]);

        DB::table('modules')
            ->whereIn('slug', ['blog-tags', 'blog_tags'])
            ->update(['parent_id' => $blogParentId, 'show_in_menu' => 1]);

        // ----------------------------------------------------------------
        // 5. Vincula submódulos de Usuários ao pai "users"
        // ----------------------------------------------------------------
        $usersParent = DB::table('modules')->where('slug', 'users')->first();

        if ($usersParent) {
            DB::table('modules')
                ->whereIn('slug', ['users-active', 'users-inactive', 'users-permissions'])
                ->update(['parent_id' => $usersParent->id]);
        }
    }

    public function down(): void
    {
        // Reverte filhos para parent_id = 0 (estado anterior)
        DB::table('modules')
            ->whereIn('slug', ['blog-posts', 'blog_posts', 'blog-categories', 'blog_categories', 'blog-tags', 'blog_tags'])
            ->update(['parent_id' => 0]);

        DB::table('modules')
            ->whereIn('slug', ['users-active', 'users-inactive', 'users-permissions'])
            ->update(['parent_id' => 0]);

        // Remove módulo blog se foi criado aqui
        DB::table('modules')->where('slug', 'blog')->delete();

        Schema::table('modules', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_id')->nullable(false)->default(0)->change();
            $table->unsignedBigInteger('id_modulo_relacionamento')->nullable(false)->default(0)->change();
        });
    }
};
