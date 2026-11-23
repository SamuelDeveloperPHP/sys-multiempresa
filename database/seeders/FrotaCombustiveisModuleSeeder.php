<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

/** Cadastra o módulo de combustíveis. */
class FrotaCombustiveisModuleSeeder extends Seeder
{
    public function run(): void
    {
        $frota = Module::where('slug', 'frota')->orWhere('name', 'Frota')->first();
        if (! $frota) {
            $this->command?->warn('Módulo "Frota" não encontrado — abortando.');
            return;
        }

        Module::updateOrCreate(
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
    }
}
