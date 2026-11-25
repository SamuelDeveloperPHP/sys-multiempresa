<?php

namespace Tests\Feature;

use App\Models\Module;
use Tests\Feature\Frota\AdminFrotaTestCase;

class DashboardAccessTest extends AdminFrotaTestCase
{
    public function test_master_admin_with_permission_reaches_dashboard(): void
    {
        $company = $this->criarEmpresa();
        $master = $this->criarUsuario($company, 'super_admin');
        $this->concederPermissao($master, $company, 'dashboard');

        $this->comContexto($master, $company)->get(route('dashboard'))->assertOk();
    }

    public function test_migration_reactivates_dashboard_disabled_before_explicit_permissions(): void
    {
        $company = $this->criarEmpresa();
        $master = $this->criarUsuario($company, 'super_admin');
        $permission = $this->concederPermissao($master, $company, 'dashboard');
        Module::whereKey($permission->module_id)->update(['is_active' => false]);

        $this->comContexto($master, $company)->get(route('dashboard'))->assertForbidden();

        $migration = require database_path('migrations/2026_11_25_000001_reativar_modulo_dashboard.php');
        $migration->up();

        $this->comContexto($master, $company)->get(route('dashboard'))->assertOk();
    }

    public function test_dashboard_module_cannot_be_disabled_renamed_or_removed(): void
    {
        $company = $this->criarEmpresa();
        $master = $this->criarUsuario($company, 'super_admin');
        $dashboard = Module::findOrFail($this->concederPermissao($master, $company, 'dashboard')->module_id);
        $this->concederPermissao($master, $company, 'admin.modules.index', ['list', 'edit', 'delete']);
        $this->comContexto($master, $company);

        $payload = [
            'name' => 'Dashboard', 'slug' => $dashboard->slug, 'route_name' => 'dashboard',
            'is_active' => false, 'show_in_menu' => false,
        ];
        $this->put(route('admin.modules.update', $dashboard), $payload)->assertSessionHasErrors('is_active');
        $this->put(route('admin.modules.update', $dashboard), array_merge($payload, [
            'is_active' => true, 'route_name' => 'outra.rota',
        ]))->assertSessionHasErrors('route_name');
        $this->delete(route('admin.modules.destroy', $dashboard))->assertSessionHasErrors('error');

        $this->assertDatabaseHas('modules', ['id' => $dashboard->id, 'is_active' => 1, 'route_name' => 'dashboard']);

        // Ocultar do menu continua permitido.
        $this->put(route('admin.modules.update', $dashboard), array_merge($payload, ['is_active' => true]))
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('modules', ['id' => $dashboard->id, 'is_active' => 1, 'show_in_menu' => 0]);
    }
}
