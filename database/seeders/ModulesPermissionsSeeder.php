<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;
use App\Models\ModulePermission;

class ModulesPermissionsSeeder extends Seeder
{
    protected int $companyId = 1;
    protected int $userId    = 1;

    public function run(): void
    {
        /*
         * Definição dos módulos com base no snapshot que você passou.
         * parent_slug = slug do módulo pai (ou null para raiz).
         * id_mod_rel_slug = slug do módulo que será usado em id_modulo_relacionamento
         *                    (na maioria dos casos, o próprio pai).
         */

        
        $modules = [
            // 1 - Config. de Usuários (pai)
            [
                'slug'             => 'user-config',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Config. de Usuários',
                'route_name'       => null,
                'icon'             => 'fa-solid fa-users-gear',
                'url'              => null,
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 10,
            ],

            // 2 - Lista (filho de Config. de Usuários)
            [
                'slug'             => 'users-list',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Lista',
                'route_name'       => 'admin.users.index',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 1,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 1,
            ],

            // 3 - Níveis de Acesso
            [
                'slug'             => 'users-permissions',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Níveis de Acesso',
                'route_name'       => 'admin.users.permissions.index',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 2,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 2,
            ],

            // 4 - Ativos
            [
                'slug'             => 'users-active',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Ativos',
                'route_name'       => 'users.active',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 3,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 3,
            ],

            // 5 - Inativos
            [
                'slug'             => 'users-inactive',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Inativos',
                'route_name'       => 'users.inactive',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 4,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 4,
            ],

            // 6 - Config. do Sistema (pai)
            [
                'slug'             => 'system-config',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Config. do Sistema',
                'route_name'       => null,
                'icon'             => 'fa-solid fa-gear',
                'url'              => null,
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 20,
            ],

            // 7 - Módulos
            [
                'slug'             => 'modules',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Módulos',
                'route_name'       => 'admin.modules.index',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 1,
            ],

            // 8 - Backups
            [
                'slug'             => 'backups',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Backups',
                'route_name'       => 'admin.backups.index',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 0,
                'is_active'        => 0,
                'show_in_menu'     => 1,
                'sort_order'       => 2,
            ],

            // 9 - Empresas (pai)
            [
                'slug'             => 'companies',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Empresas',
                'route_name'       => 'companies.index',
                'icon'             => 'fa-solid fa-building',
                'url'              => null,
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 5,
            ],

            // 10 - Dashboard
            [
                'slug'             => 'dashboard',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Dashboard',
                'route_name'       => 'dashboard',
                'icon'             => null,
                'url'              => 'dashboard',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 0,
            ],

            // 11~16 - Ações dos módulos (create/store/edit/update/show/destroy)
            [
                'slug'             => 'modulos create',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Modulos Create',
                'route_name'       => 'admin.modules.create',
                'icon'             => null,
                'url'              => 'admin.modules.create',
                'ordem'            => 2,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 1,
            ],
            [
                'slug'             => 'modules store',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Modulos Store',
                'route_name'       => 'admin.modules.store',
                'icon'             => null,
                'url'              => 'admin/configuracao/modulo/store',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'modulos edit',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Modulos Edit',
                'route_name'       => 'admin.modules.edit',
                'icon'             => null,
                'url'              => 'admin/configuracao/modulo/edit',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'modulo update',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Modulo Update',
                'route_name'       => 'admin.modules.update',
                'icon'             => null,
                'url'              => 'admin.modules.update',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'modulo show',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Modulo Show',
                'route_name'       => 'admin.modules.show',
                'icon'             => null,
                'url'              => 'admin/configuracao/modulo/show',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'modulo destroy',
                'parent_slug'      => 'system-config',
                'id_mod_rel_slug'  => 'system-config',
                'name'             => 'Modulo Destroy',
                'route_name'       => 'admin.modules.destroy',
                'icon'             => null,
                'url'              => 'admin/configuracao/modulo/destroy',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],

            // 17~23 - ações de usuários
            [
                'slug'             => 'users destroy',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Users Destroy',
                'route_name'       => 'users.destroy',
                'icon'             => null,
                'url'              => null,
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'usuario create',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Usuario Create',
                'route_name'       => 'admin.users.create',
                'icon'             => null,
                'url'              => 'admin/configuracao/users/create',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'usuario store',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Usuario Store',
                'route_name'       => 'admin.users.store',
                'icon'             => null,
                'url'              => 'admin/configuracao/users/store',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'usuario edit',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Usuario Edit',
                'route_name'       => 'admin.users.edit',
                'icon'             => null,
                'url'              => 'admin/configuracao/users/edit',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'usuario update',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'Usuario Update',
                'route_name'       => 'admin.users.update',
                'icon'             => null,
                'url'              => 'admin/configuracao/users/update',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'user show',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'User Show',
                'route_name'       => 'admin.users.show',
                'icon'             => null,
                'url'              => 'admin/configuracao/users/show',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],
            [
                'slug'             => 'user destroy',
                'parent_slug'      => 'user-config',
                'id_mod_rel_slug'  => 'user-config',
                'name'             => 'User Destroy',
                'route_name'       => 'admin.users.destroy',
                'icon'             => null,
                'url'              => 'admin/configuracao/users/show',
                'ordem'            => 0,
                'is_active'        => 1,
                'show_in_menu'     => 0,
                'sort_order'       => 0,
            ],

            // 24 - Blog (pai)
            [
                'slug'             => 'blog',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Blog',
                'route_name'       => 'admin.posts.index',
                'icon'             => 'fa-solid fa-newspaper',
                'url'              => 'admin/configuracao/blog',
                'ordem'            => 100,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 100,
            ],

            // 25 - Blog Posts
            [
                'slug'             => 'blog_posts',
                'parent_slug'      => 'blog',
                'id_mod_rel_slug'  => 'blog',
                'name'             => 'Posts',
                'route_name'       => 'admin.posts.index',
                'icon'             => 'fa-regular fa-file-lines',
                'url'              => 'admin/configuracao/blog',
                'ordem'            => 110,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 110,
            ],

            // 26 - Blog Categorias
            [
                'slug'             => 'blog_categories',
                'parent_slug'      => 'blog',
                'id_mod_rel_slug'  => 'blog',
                'name'             => 'Categorias',
                'route_name'       => 'admin.blog.categories.index',
                'icon'             => 'fa-regular fa-folder-open',
                'url'              => 'admin/configuracao/blog/categorias',
                'ordem'            => 120,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 120,
            ],

            // 27 - Blog Tags
            [
                'slug'             => 'blog_tags',
                'parent_slug'      => 'blog',
                'id_mod_rel_slug'  => 'blog',
                'name'             => 'Tags',
                'route_name'       => 'admin.blog.tags.index',
                'icon'             => 'fa-solid fa-hashtag',
                'url'              => 'admin/configuracao/blog/tags',
                'ordem'            => 130,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 130,
            ],
        ];

        // 1) Seed dos módulos (baseado em slug + parent_slug)
        foreach ($modules as $m) {
            $parentId = null;
            $idModuloRelacionamento = 0;

            if (!empty($m['parent_slug'])) {
                $parent = Module::where('slug', $m['parent_slug'])->first();
                $parentId = $parent?->id;
            }

            if (!empty($m['id_mod_rel_slug'])) {
                $rel = Module::where('slug', $m['id_mod_rel_slug'])->first();
                $idModuloRelacionamento = $rel?->id ?? 0;
            } elseif ($parentId) {
                $idModuloRelacionamento = $parentId;
            } else {
                $idModuloRelacionamento = 0;
            }

            Module::updateOrCreate(
                ['slug' => $m['slug']],
                [
                    'parent_id'                => $parentId,
                    'id_modulo_relacionamento' => $idModuloRelacionamento,
                    'name'                     => $m['name'],
                    'route_name'               => $m['route_name'],
                    'icon'                     => $m['icon'],
                    'url'                      => $m['url'],
                    'ordem'                    => $m['ordem'],
                    'is_active'                => $m['is_active'],
                    'show_in_menu'             => $m['show_in_menu'],
                    'sort_order'               => $m['sort_order'],
                ]
            );
        }

        // 2) Permissões (CRUD completo) para TODOS os módulos do companyId/userId definidos acima.
        //    updateOrCreate garante idempotência — rodar o seeder mais de uma vez é seguro.
        $allModules = Module::all();

        foreach ($allModules as $module) {
            ModulePermission::updateOrCreate(
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
