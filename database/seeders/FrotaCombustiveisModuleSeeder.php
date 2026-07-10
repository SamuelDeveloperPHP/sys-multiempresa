<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Registra o item de menu "Combustíveis / CO₂" (tela de referência dos
 * combustíveis e fatores de emissão) sob "Frota" e concede permissão ao(s)
 * super_admin. Idempotente (updateOrCreate).
 *   php artisan db:seed --class=FrotaCombustiveisModuleSeeder
 */
class FrotaCombustiveisModuleSeeder extends Seeder
{
    public function run(): void
    {
        $frota = Module::where('slug', 'frota')->orWhere('name', 'Frota')->first();
        if (! $frota) {
            $this->command?->warn('Módulo "Frota" não encontrado — abortando.');
            return;
        }

        $modulo = Module::updateOrCreate(
            ['route_name' => 'admin.frota.combustiveis.index'],
            [
                'name'         => 'Combustíveis / CO₂',
                'slug'         => 'frota.combustiveis',
                'url'          => 'admin/frota/combustiveis',
                'icon'         => 'fa-solid fa-gas-pump',
                'parent_id'    => $frota->id,
                'is_active'    => 1,
                'show_in_menu' => 1,
                'sort_order'   => 245, // logo após Abastecimentos (240)
            ],
        );

        User::where('type', 'super_admin')->get()->each(function (User $u) use ($modulo) {
            ModulePermission::withoutGlobalScopes()->updateOrCreate(
                ['user_id' => $u->id, 'module_id' => $modulo->id],
                [
                    'company_id' => $u->company_id ?? 1,
                    'can_list'   => 1, 'can_view' => 1, 'can_create' => 1, 'can_edit' => 1, 'can_delete' => 1,
                ],
            );
        });

        $this->command?->info("Módulo #{$modulo->id} 'Combustíveis / CO₂' vinculado à Frota + permissões concedidas.");
    }
}
