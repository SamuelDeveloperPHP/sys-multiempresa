<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Fonte canônica de dados iniciais.
     *
     * REGRA: ModulesPermissionsSeeder é o único seeder de módulos/permissões.
     * Não execute ModuleSeeder, BlogModulesSeeder ou ModulePermissionSeeder —
     * todos foram consolidados aqui.
     *
     * Para reparar dados inconsistentes:
     *   php artisan modules:fix
     */
    public function run(): void
    {
        $this->call([
            CompanySeeder::class,
            ModulesPermissionsSeeder::class,
            InitialPermissionsSeeder::class,
            // Estoque: módulos + permissões para super_admin/manager. Idempotente.
            EstoqueModulesSeeder::class,
        ]);
    }
}
