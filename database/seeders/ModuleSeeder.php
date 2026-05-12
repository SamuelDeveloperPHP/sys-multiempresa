<?php

// database/seeders/ModuleSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Configurações de Usuários (item de menu principal)
        $userConfig = Module::create([
            'parent_id'  => null, // item principal
            'name'       => 'Configurações de Usuários',
            'slug'       => 'user-config',
            'icon'       => 'fa-solid fa-users-gear',
            'route_name' => null, // só o dropdown, sem rota direta
            'sort_order' => 10,
            'is_active'  => true,
        ]);

        // filhos (dropdown)
        Module::create([
            'parent_id'  => $userConfig->id,
            'name'       => 'Lista',
            'slug'       => 'users-list',
            'icon'       => null,
            'route_name' => 'users.index',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        Module::create([
            'parent_id'  => $userConfig->id,
            'name'       => 'Níveis de Acesso',
            'slug'       => 'users-permissions',
            'icon'       => null,
            'route_name' => 'admin.users.permissions.index', // exemplo
            'sort_order' => 2,
            'is_active'  => true,
        ]);

        Module::create([
            'parent_id'  => $userConfig->id,
            'name'       => 'Ativos',
            'slug'       => 'users-active',
            'icon'       => null,
            'route_name' => 'users.active',
            'sort_order' => 3,
            'is_active'  => true,
        ]);

        Module::create([
            'parent_id'  => $userConfig->id,
            'name'       => 'Inativos',
            'slug'       => 'users-inactive',
            'icon'       => null,
            'route_name' => 'users.inactive',
            'sort_order' => 4,
            'is_active'  => true,
        ]);

        // 2) Configurações do Sistema (item de menu principal)
        $systemConfig = Module::create([
            'parent_id'  => null,
            'name'       => 'Config. do Sistema',
            'slug'       => 'system-config',
            'icon'       => 'fa-solid fa-gear',
            'route_name' => null,
            'sort_order' => 20,
            'is_active'  => true,
        ]);

        Module::create([
            'parent_id'  => $systemConfig->id,
            'name'       => 'Módulos',
            'slug'       => 'modules',
            'icon'       => null,
            'route_name' => 'admin.modules.index',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        Module::create([
            'parent_id'  => $systemConfig->id,
            'name'       => 'Backups',
            'slug'       => 'backups',
            'icon'       => null,
            'route_name' => 'admin.backups.index', // exemplo
            'sort_order' => 2,
            'is_active'  => false, // ainda não implementado
        ]);

        // 3) Empresas (menu simples)
        Module::create([
            'parent_id'  => null,
            'name'       => 'Empresas',
            'slug'       => 'companies',
            'icon'       => 'fa-solid fa-building',
            'route_name' => 'companies.index', // link direto
            'sort_order' => 5,
            'is_active'  => true,
        ]);
    }
}
