<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

/** Cadastra o módulo de execuções de checklist. */
class FrotaChecklistExecucoesModuleSeeder extends Seeder
{
    public function run(): void
    {
        $frota = Module::where('slug', 'frota')->orWhere('name', 'Frota')->first();
        if (! $frota) {
            $this->command?->warn('Módulo "Frota" não encontrado — abortando.');
            return;
        }

        Module::updateOrCreate(
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
    }
}
