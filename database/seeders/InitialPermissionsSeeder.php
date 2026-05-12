<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Database\Seeder;

class InitialPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::find(1);

        if (!$user) {
            $this->command->warn('Usuário ID=1 não encontrado. Crie o usuário antes de rodar este seeder.');
            return;
        }

        // Garante que ele é super_admin (bate com hasModulePermission)
        $user->type = 'super_admin';
        $user->save();

        $companies = Company::all();
        $modules   = Module::all();

        if ($companies->isEmpty() || $modules->isEmpty()) {
            $this->command->warn('Sem empresas ou módulos para atribuir permissões.');
            return;
        }

        foreach ($companies as $company) {
            // Garante vínculo na tabela company_user
            if (!$user->companies()->where('company_id', $company->id)->exists()) {
                $user->companies()->attach($company->id, ['role' => 'owner']);
            }

            foreach ($modules as $module) {
                ModulePermission::updateOrCreate(
                    [
                        'company_id' => $company->id,
                        'user_id'    => $user->id,
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
