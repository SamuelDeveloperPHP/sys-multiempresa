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
                'icon'             => 'fa-solid fa-list',
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
                'icon'             => 'fa-solid fa-cubes',
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
                'icon'             => 'fa-solid fa-database',
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

            // ==========================================================
            // FROTA — pai + sub-modulos
            // ----------------------------------------------------------
            // ATIVOS: ja possuem Controller + Model + React pages em
            // app/Http/Controllers/Admin/Frota/ e Pages/Admin/Frota/.
            //
            // PLACEHOLDERS (is_active=0, show_in_menu=0): correspondem
            // aos sub-modulos do VeiculoController legado (engeativos2)
            // que ainda nao foram migrados. Mantidos no banco para
            // documentar o escopo e facilitar futura ativacao.
            // ==========================================================

            // Fornecedores (cadastro compartilhado entre módulos)
            [
                'slug'             => 'fornecedores',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Fornecedores',
                'route_name'       => 'admin.fornecedores.index',
                'icon'             => 'fa-solid fa-truck-fast',
                'url'              => 'admin/fornecedores',
                'ordem'            => 150,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 150,
            ],

            // 28 - Frota (pai)
            [
                'slug'             => 'frota',
                'parent_slug'      => null,
                'id_mod_rel_slug'  => null,
                'name'             => 'Frota',
                'route_name'       => null,
                'icon'             => 'fa-solid fa-truck',
                'url'              => null,
                'ordem'            => 200,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 200,
            ],

            // --- Filhos ATIVOS (controllers existem) ---

            // 29 - Veiculos
            [
                'slug'             => 'frota.veiculos',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Veiculos',
                'route_name'       => 'admin.frota.veiculos.index',
                'icon'             => 'fa-solid fa-car',
                'url'              => 'admin/frota/veiculos',
                'ordem'            => 210,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 210,
            ],

            // 30 - Locacoes
            [
                'slug'             => 'frota.locacoes',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Locacoes',
                'route_name'       => 'admin.frota.locacoes.index',
                'icon'             => 'fa-solid fa-link',
                'url'              => 'admin/frota/locacoes',
                'ordem'            => 220,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 220,
            ],

            // 31 - Checklists
            [
                'slug'             => 'frota.checklists',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Checklists',
                'route_name'       => 'admin.frota.checklists.index',
                'icon'             => 'fa-solid fa-clipboard-check',
                'url'              => 'admin/frota/checklists',
                'ordem'            => 230,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 230,
            ],

            // 32 - Abastecimentos
            [
                'slug'             => 'frota.abastecimentos',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Abastecimentos',
                'route_name'       => 'admin.frota.abastecimentos.index',
                'icon'             => 'fa-solid fa-gas-pump',
                'url'              => 'admin/frota/abastecimentos',
                'ordem'            => 240,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 240,
            ],

            // 33 - Diario de Bordo
            [
                'slug'             => 'frota.diario',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Diario de Bordo',
                'route_name'       => 'admin.frota.diario.index',
                'icon'             => 'fa-solid fa-book',
                'url'              => 'admin/frota/diario',
                'ordem'            => 250,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 250,
            ],

            // 34 - Horimetros
            [
                'slug'             => 'frota.horimetros',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Horimetros',
                'route_name'       => 'admin.frota.horimetros.index',
                'icon'             => 'fa-solid fa-clock',
                'url'              => 'admin/frota/horimetros',
                'ordem'            => 260,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 260,
            ],

            // 35 - Hodometros (quilometragem)
            [
                'slug'             => 'frota.quilometragem',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Hodometros',
                'route_name'       => 'admin.frota.quilometragem.index',
                'icon'             => 'fa-solid fa-gauge-high',
                'url'              => 'admin/frota/quilometragem',
                'ordem'            => 270,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 270,
            ],

            // 36 - Preventivas
            [
                'slug'             => 'frota.preventivas',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Preventivas',
                'route_name'       => 'admin.frota.preventivas.index',
                'icon'             => 'fa-solid fa-wrench',
                'url'              => 'admin/frota/preventivas',
                'ordem'            => 280,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 280,
            ],

            // --- Filhos PLACEHOLDER (controllers ainda nao migrados) ---

            // 37 - Manutencao Corretiva
            [
                'slug'             => 'frota.manutencao_corretiva',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Manutencao Corretiva',
                'route_name'       => 'admin.frota.manutencao-corretiva.index',
                'icon'             => 'fa-solid fa-screwdriver-wrench',
                'url'              => null,
                'ordem'            => 290,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 290,
            ],

            // 38 - Tipos de Veiculo
            [
                'slug'             => 'frota.tipos',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Tipos de Veiculo',
                'route_name'       => 'admin.frota.tipos.index',
                'icon'             => 'fa-solid fa-list',
                'url'              => 'admin/frota/tipos',
                'ordem'            => 300,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 300,
            ],

            // 39 - Categorias
            [
                'slug'             => 'frota.categorias',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Categorias',
                'route_name'       => 'admin.frota.categorias.index',
                'icon'             => 'fa-solid fa-tags',
                'url'              => 'admin/frota/categorias',
                'ordem'            => 310,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 310,
            ],

            // 40 - Subcategorias
            [
                'slug'             => 'frota.subcategorias',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Subcategorias',
                'route_name'       => 'admin.frota.subcategorias.index',
                'icon'             => 'fa-solid fa-tag',
                'url'              => 'admin/frota/subcategorias',
                'ordem'            => 320,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 320,
            ],

            // 41 - Marcas
            [
                'slug'             => 'frota.marcas',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Marcas',
                'route_name'       => 'admin.frota.marcas.index',
                'icon'             => 'fa-solid fa-trademark',
                'url'              => 'admin/frota/marcas',
                'ordem'            => 330,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 330,
            ],

            // 42 - Modelos
            [
                'slug'             => 'frota.modelos',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Modelos',
                'route_name'       => 'admin.frota.modelos.index',
                'icon'             => 'fa-solid fa-cube',
                'url'              => 'admin/frota/modelos',
                'ordem'            => 340,
                'is_active'        => 1,
                'show_in_menu'     => 1,
                'sort_order'       => 340,
            ],

            // 43 - IPVA
            [
                'slug'             => 'frota.ipva',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'IPVA',
                'route_name'       => 'admin.frota.ipva.index',
                'icon'             => 'fa-solid fa-file-invoice-dollar',
                'url'              => null,
                'ordem'            => 350,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 350,
            ],

            // 44 - Seguros
            [
                'slug'             => 'frota.seguros',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Seguros',
                'route_name'       => 'admin.frota.seguros.index',
                'icon'             => 'fa-solid fa-shield-halved',
                'url'              => null,
                'ordem'            => 360,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 360,
            ],

            // 45 - Docs Legais
            [
                'slug'             => 'frota.docs_legais',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Docs. Legais',
                'route_name'       => 'admin.frota.docs-legais.index',
                'icon'             => 'fa-solid fa-file-contract',
                'url'              => null,
                'ordem'            => 370,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 370,
            ],

            // 46 - Docs Tecnicos
            [
                'slug'             => 'frota.docs_tecnicos',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Docs. Tecnicos',
                'route_name'       => 'admin.frota.docs-tecnicos.index',
                'icon'             => 'fa-solid fa-file-lines',
                'url'              => null,
                'ordem'            => 380,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 380,
            ],

            // 47 - Imagens / Galeria
            [
                'slug'             => 'frota.imagens',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Imagens',
                'route_name'       => 'admin.frota.imagens.index',
                'icon'             => 'fa-solid fa-images',
                'url'              => null,
                'ordem'            => 390,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 390,
            ],

            // 48 - Acessorios
            [
                'slug'             => 'frota.acessorios',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Acessorios',
                'route_name'       => 'admin.frota.acessorios.index',
                'icon'             => 'fa-solid fa-puzzle-piece',
                'url'              => null,
                'ordem'            => 400,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 400,
            ],

            // 49 - Tacografo
            [
                'slug'             => 'frota.tacografo',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Tacografo',
                'route_name'       => 'admin.frota.tacografo.index',
                'icon'             => 'fa-solid fa-stopwatch',
                'url'              => null,
                'ordem'            => 410,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 410,
            ],

            // 50 - Depreciacao
            [
                'slug'             => 'frota.depreciacao',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Depreciacao',
                'route_name'       => 'admin.frota.depreciacao.index',
                'icon'             => 'fa-solid fa-chart-line',
                'url'              => null,
                'ordem'            => 420,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 420,
            ],

            // 51 - Composicao Valor Locacao
            [
                'slug'             => 'frota.composicao_valor_locacao',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Composicao Valor Locacao',
                'route_name'       => 'admin.frota.composicao-valor-locacao.index',
                'icon'             => 'fa-solid fa-coins',
                'url'              => null,
                'ordem'            => 430,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 430,
            ],

            // 52 - Veiculos Alugados
            [
                'slug'             => 'frota.veiculos_alugados',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Veiculos Alugados',
                'route_name'       => 'admin.frota.veiculos-alugados.index',
                'icon'             => 'fa-solid fa-handshake',
                'url'              => null,
                'ordem'            => 440,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 440,
            ],

            // 53 - Overlays
            [
                'slug'             => 'frota.overlays',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Overlays',
                'route_name'       => 'admin.frota.overlays.index',
                'icon'             => 'fa-solid fa-layer-group',
                'url'              => null,
                'ordem'            => 450,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 450,
            ],

            // 54 - Relatorios de Veiculos
            [
                'slug'             => 'frota.relatorios',
                'parent_slug'      => 'frota',
                'id_mod_rel_slug'  => 'frota',
                'name'             => 'Relatorios',
                'route_name'       => 'admin.frota.relatorios.index',
                'icon'             => 'fa-solid fa-chart-pie',
                'url'              => null,
                'ordem'            => 460,
                'is_active'        => 0,
                'show_in_menu'     => 0,
                'sort_order'       => 460,
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
