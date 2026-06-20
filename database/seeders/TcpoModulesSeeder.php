<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Cadastra os módulos do TCPO no menu + permissões para super_admin e manager.
 * Idempotente (updateOrInsert por slug). Espelha EstoqueModulesSeeder.
 *
 * Uso:
 *   php artisan db:seed --class=TcpoModulesSeeder
 */
class TcpoModulesSeeder extends Seeder
{
    protected array $tiposComAcesso = ['super_admin', 'manager'];

    protected array $modulos = [
        // PAI — grupo no sidebar
        [
            'slug'        => 'tcpo',
            'parent_slug' => null,
            'name'        => 'TCPO',
            'route_name'  => null,
            'icon'        => 'fa-solid fa-ruler-combined',
            'sort_order'  => 51, // logo após Estoque (50)
        ],

        // FILHOS
        [
            'slug'        => 'tcpo.composicoes',
            'parent_slug' => 'tcpo',
            'name'        => 'Composições',
            'route_name'  => 'admin.tcpo.composicoes.index',
            'icon'        => 'fa-solid fa-list-check',
            'sort_order'  => 1,
        ],
        [
            'slug'        => 'tcpo.insumos',
            'parent_slug' => 'tcpo',
            'name'        => 'Insumos',
            'route_name'  => 'admin.tcpo.insumos.index',
            'icon'        => 'fa-solid fa-cubes',
            'sort_order'  => 2,
        ],
    ];

    public function run(): void
    {
        // ----- 1) PAIS -----
        $paisIdsBySlug = [];
        foreach (array_filter($this->modulos, fn ($m) => $m['parent_slug'] === null) as $m) {
            $paisIdsBySlug[$m['slug']] = $this->upsertModulo($m, null);
        }

        // ----- 2) FILHOS -----
        $filhosIds = [];
        foreach (array_filter($this->modulos, fn ($m) => $m['parent_slug'] !== null) as $m) {
            $parentId = $paisIdsBySlug[$m['parent_slug']]
                ?? Module::where('slug', $m['parent_slug'])->value('id');
            $filhosIds[] = $this->upsertModulo($m, $parentId);
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

        $this->command->info('Módulos TCPO cadastrados: ' . count($todosIds));
        $this->command->info('Permissões aplicadas: ' . $totalPerms . ' (usuários: ' . $users->count()
            . ', empresas: ' . count($companies) . ')');
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
