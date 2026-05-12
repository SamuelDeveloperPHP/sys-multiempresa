<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;
use App\Models\ModulePermission;

class BlogModulesSeeder extends Seeder
{
    protected int $companyId = 1;
    protected int $userId    = 1;

    public function run(): void
    {
        // 🔹 Módulo pai: Blog
        // Usando 0 para campos de relacionamento no root
        $blogParent = Module::firstOrCreate(
            ['slug' => 'blog'],
            [
                'parent_id'                => 0,   // raiz
                'id_modulo_relacionamento' => 0,   // raiz
                'name'                     => 'Blog',
                'route_name'               => 'admin.posts.index',
                'icon'                     => 'fa-solid fa-newspaper',
                'url'                      => 'admin/configuracao/blog',
                'ordem'                    => 100,
                'sort_order'               => 100,
                'is_active'                => 1,
                'show_in_menu'             => 1,
            ]
        );

        $childrenData = [
            [
                'slug'       => 'blog_posts',
                'name'       => 'Posts',
                'route_name' => 'admin.posts.index',
                'url'        => 'admin/configuracao/blog',
                'icon'       => 'fa-regular fa-file-lines',
                'ordem'      => 110,
                'sort_order' => 110,
            ],
            [
                'slug'       => 'blog_categories',
                'name'       => 'Categorias',
                'route_name' => 'admin.blog.categories.index',
                'url'        => 'admin/configuracao/blog/categorias',
                'icon'       => 'fa-regular fa-folder-open',
                'ordem'      => 120,
                'sort_order' => 120,
            ],
            [
                'slug'       => 'blog_tags',
                'name'       => 'Tags',
                'route_name' => 'admin.blog.tags.index',
                'url'        => 'admin/configuracao/blog/tags',
                'icon'       => 'fa-solid fa-hashtag',
                'ordem'      => 130,
                'sort_order' => 130,
            ],
        ];

        $allModules = [];
        $allModules[] = $blogParent;

        foreach ($childrenData as $data) {
            $module = Module::firstOrCreate(
                ['slug' => $data['slug']],
                [
                    'parent_id'                => $blogParent->id,
                    'id_modulo_relacionamento' => $blogParent->id, // aponta pro pai
                    'name'                     => $data['name'],
                    'route_name'               => $data['route_name'],
                    'icon'                     => $data['icon'],
                    'url'                      => $data['url'],
                    'ordem'                    => $data['ordem'],
                    'sort_order'               => $data['sort_order'],
                    'is_active'                => 1,
                    'show_in_menu'             => 1,
                ]
            );

            $allModules[] = $module;
        }

        // 🔹 Permissões para company_id = 1, user_id = 1
        foreach ($allModules as $module) {
            ModulePermission::firstOrCreate(
                [
                    'company_id' => $this->companyId,
                    'user_id'    => $this->userId,
                    'module_id'  => $module->id,
                ],
                [
                    'can_list'   => 1,
                    'can_view'   => 1,
                    'can_create' => 1,
                    'can_edit'   => 1,
                    'can_delete' => 1,
                ]
            );
        }
    }
}
