<?php

// database/seeders/ModulePermissionSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\Company;

class ModulePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $userId = 1;

        // Para simplificar: dar permissão em TODOS os módulos para user 1 em TODAS as empresas
        $companies = Company::all();
        $modules   = Module::all();

        foreach ($companies as $company) {
            foreach ($modules as $module) {
                ModulePermission::updateOrCreate(
                    [
                        'company_id' => $company->id,
                        'user_id'    => $userId,
                        'module_id'  => $module->id,
                    ],
                    [
                        'can_list'   => true,
                        'can_view'   => true,
                        'can_create' => true,
                        'can_edit'   => true,
                        'can_delete' => true,
                    ]
                );
            }
        }
    }
}
