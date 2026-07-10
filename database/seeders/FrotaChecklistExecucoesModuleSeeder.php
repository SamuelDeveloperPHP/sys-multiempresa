<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Registra o módulo de menu "Checklists preenchidos" (painel do gerente das
 * execuções de checklist do mobile) sob o item "Frota" e concede a permissão
 * ao usuário super_admin. Espelha o módulo "Diário de bordo" (id 45 = Frota).
 *
 * Idempotente (updateOrCreate): pode rodar de novo sem duplicar.
 *   php artisan db:seed --class=FrotaChecklistExecucoesModuleSeeder
 */
class FrotaChecklistExecucoesModuleSeeder extends Seeder
{
    public function run(): void
    {
        $frota = Module::where('slug', 'frota')->orWhere('name', 'Frota')->first();
        if (! $frota) {
            $this->command?->warn('Módulo "Frota" não encontrado — abortando.');
            return;
        }

        $modulo = Module::updateOrCreate(
            ['route_name' => 'admin.frota.checklist-execucoes.index'],
            [
                'name'         => 'Checklists preenchidos',
                'slug'         => 'frota.checklist-execucoes',
                'url'          => 'admin/frota/checklist-execucoes',
                'icon'         => 'fa-solid fa-clipboard-check',
                'parent_id'    => $frota->id,
                'is_active'    => 1,
                'show_in_menu' => 1,
                'sort_order'   => 251, // logo após o Diário de bordo (250)
            ],
        );

        // Permissão total para o(s) super_admin (o "master"). super_admin já vê
        // tudo no menu, mas a linha deixa explícito e cobre checagens de CRUD.
        User::where('type', 'super_admin')->get()->each(function (User $u) use ($modulo) {
            ModulePermission::withoutGlobalScopes()->updateOrCreate(
                ['user_id' => $u->id, 'module_id' => $modulo->id],
                [
                    'company_id' => $u->company_id ?? 1,
                    'can_list'   => 1,
                    'can_view'   => 1,
                    'can_create' => 1,
                    'can_edit'   => 1,
                    'can_delete' => 1,
                ],
            );
        });

        $this->command?->info("Módulo #{$modulo->id} 'Checklists preenchidos' vinculado à Frota + permissões concedidas.");
    }
}
