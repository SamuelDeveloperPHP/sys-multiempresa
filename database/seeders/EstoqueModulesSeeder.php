<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Cadastra módulos de Estoque no menu + permissões para os tipos de usuário
 * que devem ter acesso (super_admin, manager).
 *
 * Idempotente — pode rodar várias vezes sem duplicar.
 *
 * Uso:
 *   php artisan db:seed --class=EstoqueModulesSeeder
 *
 * Tipos NÃO contemplados (intencional):
 *   - motorista : decisão de produto, motoristas só usam PWA mobile.
 *   - user      : nível básico — recebe acesso só se admin definir manualmente.
 */
class EstoqueModulesSeeder extends Seeder
{
    /**
     * Tipos de usuário que recebem permissão automática neste seeder.
     */
    protected array $tiposComAcesso = ['super_admin', 'manager'];

    /**
     * Estrutura dos módulos. Pais primeiro, filhos referenciam por parent_slug.
     */
    protected array $modulos = [
        // ------------------------------------------------------------------
        // PAI
        // ------------------------------------------------------------------
        [
            'slug'         => 'estoque',
            'parent_slug'  => null,
            'name'         => 'Estoque',
            'route_name'   => null,
            'icon'         => 'fa-solid fa-boxes-stacked',
            'sort_order'   => 50,
        ],

        // ------------------------------------------------------------------
        // FILHOS — FASE 2 (catálogo)
        // ------------------------------------------------------------------
        [
            'slug'         => 'estoque.produtos',
            'parent_slug'  => 'estoque',
            'name'         => 'Produtos',
            'route_name'   => 'admin.estoque.produtos.index',
            'icon'         => 'fa-solid fa-box',
            'sort_order'   => 1,
        ],
        [
            'slug'         => 'estoque.categorias',
            'parent_slug'  => 'estoque',
            'name'         => 'Categorias',
            'route_name'   => 'admin.estoque.categorias.index',
            'icon'         => 'fa-solid fa-folder-tree',
            'sort_order'   => 2,
        ],

        // ------------------------------------------------------------------
        // FASES FUTURAS (placeholders — show_in_menu=false até implementar)
        // ------------------------------------------------------------------
        [
            'slug'         => 'estoque.movimentacoes',
            'parent_slug'  => 'estoque',
            'name'         => 'Movimentações',
            'route_name'   => 'admin.estoque.movimentacoes.index',
            'icon'         => 'fa-solid fa-arrow-right-arrow-left',
            'sort_order'   => 3,
            'show_in_menu' => true, // FASE 3 implementada
        ],
        [
            'slug'         => 'estoque.requisicoes',
            'parent_slug'  => 'estoque',
            'name'         => 'Requisições',
            'route_name'   => 'admin.estoque.requisicoes.index',
            'icon'         => 'fa-solid fa-clipboard-list',
            'sort_order'   => 4,
            'show_in_menu' => true, // FASE 4 implementada
        ],
        [
            'slug'         => 'estoque.inventarios',
            'parent_slug'  => 'estoque',
            'name'         => 'Inventários e Alertas',
            'route_name'   => 'admin.estoque.inventarios.index',
            'icon'         => 'fa-solid fa-list-check',
            'sort_order'   => 5,
            'show_in_menu' => true, // FASE 5 implementada
        ],
        [
            'slug'         => 'estoque.devolucoes',
            'parent_slug'  => 'estoque',
            'name'         => 'Devoluções',
            'route_name'   => 'admin.estoque.devolucoes.index',
            'icon'         => 'fa-solid fa-rotate-left',
            'sort_order'   => 5,
            'show_in_menu' => true, // FASE 7.B
        ],
        [
            'slug'         => 'estoque.relatorios',
            'parent_slug'  => 'estoque',
            'name'         => 'Relatórios',
            'route_name'   => 'admin.estoque.relatorios.hub',
            'icon'         => 'fa-solid fa-chart-line',
            'sort_order'   => 6,
            'show_in_menu' => true, // FASE 6 implementada
        ],
    ];

    public function run(): void
    {
        // ----- 1) PAIS -----
        $paisIdsBySlug = [];
        foreach (array_filter($this->modulos, fn ($m) => $m['parent_slug'] === null) as $m) {
            $id = $this->upsertModulo($m, null);
            $paisIdsBySlug[$m['slug']] = $id;
        }

        // ----- 2) FILHOS -----
        $filhosIds = [];
        foreach (array_filter($this->modulos, fn ($m) => $m['parent_slug'] !== null) as $m) {
            $parentId = $paisIdsBySlug[$m['parent_slug']]
                ?? Module::where('slug', $m['parent_slug'])->value('id');
            $id = $this->upsertModulo($m, $parentId);
            $filhosIds[] = $id;
        }

        $todosIds = array_merge(array_values($paisIdsBySlug), $filhosIds);

        // ----- 3) PERMISSÕES -----
        $companies = DB::table('companies')->pluck('id')->all();
        $users     = User::whereIn('type', $this->tiposComAcesso)->get(['id', 'type']);

        $totalPerms = 0;
        foreach ($todosIds as $moduleId) {
            foreach ($users as $user) {
                foreach ($companies as $companyId) {
                    ModulePermission::updateOrCreate(
                        [
                            'user_id'    => $user->id,
                            'module_id'  => $moduleId,
                            'company_id' => $companyId,
                        ],
                        [
                            'can_list'   => true,
                            'can_view'   => true,
                            'can_create' => true,
                            'can_edit'   => true,
                            'can_delete' => true,
                        ]
                    );
                    $totalPerms++;
                }
            }
        }

        $this->command->info('Módulos Estoque cadastrados: ' . count($todosIds));
        $this->command->info('Permissões aplicadas: ' . $totalPerms . ' (usuários: ' . $users->count()
            . ', empresas: ' . count($companies) . ')');
        $this->command->info('Tipos contemplados: ' . implode(', ', $this->tiposComAcesso));
    }

    protected function upsertModulo(array $m, ?int $parentId): int
    {
        $now = now();
        DB::table('modules')->updateOrInsert(
            ['slug' => $m['slug']],
            [
                'parent_id'    => $parentId,
                'name'         => $m['name'],
                'route_name'   => $m['route_name'] ?? null,
                'icon'         => $m['icon'] ?? null,
                'sort_order'   => $m['sort_order'] ?? 0,
                'is_active'    => $m['is_active'] ?? true,
                'show_in_menu' => $m['show_in_menu'] ?? true,
                'updated_at'   => $now,
                'created_at'   => DB::raw('COALESCE(created_at, NOW())'),
            ]
        );
        return (int) DB::table('modules')->where('slug', $m['slug'])->value('id');
    }
}
