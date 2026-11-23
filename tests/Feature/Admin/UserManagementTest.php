<?php

namespace Tests\Feature\Admin;

use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Frota\AdminFrotaTestCase;

class UserManagementTest extends AdminFrotaTestCase
{
    public function test_local_management_cannot_assign_global_roles_or_other_companies(): void
    {
        $company = $this->criarEmpresa();
        $other = $this->criarEmpresa();
        $actor = $this->criarUsuario($company);
        $this->concederPermissao($actor, $company, 'admin.users.index', ['create']);
        $this->comContexto($actor, $company);
        $payload = [
            'name' => 'Teste', 'email' => 'conta@example.test',
            'password' => 'Teste@578', 'password_confirmation' => 'Teste@578',
            'companies' => [$company->id], 'type' => 'super_admin',
        ];
        Log::spy();
        $this->post(route('admin.users.store'), $payload)->assertSessionHasErrors('type')
            ->assertSessionMissing('_old_input.password')->assertSessionMissing('_old_input.password_confirmation');
        Log::shouldNotHaveReceived('error');
        $payload['type'] = 'user';
        $payload['companies'] = [$other->id];
        $this->post(route('admin.users.store'), $payload)->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => $payload['email']]);
        $payload['companies'] = [$company->id];
        $this->post(route('admin.users.store'), $payload)->assertSessionHasNoErrors();
        $this->assertTrue(User::whereEmail($payload['email'])->firstOrFail()->companies()->whereKey($company->id)->exists());
    }

    public function test_local_management_preserves_shared_identity_and_foreign_permissions(): void
    {
        $company = $this->criarEmpresa();
        $other = $this->criarEmpresa();
        $actor = $this->criarUsuario($company);
        $shared = $this->criarUsuario($company, 'user');
        $shared->companies()->attach($other->id);
        $foreign = $this->criarUsuario($other, 'user');
        $permission = $this->concederPermissao($actor, $company, 'admin.users.index', ['list', 'edit', 'delete']);
        $foreignPermission = $this->concederPermissao($shared, $other, 'admin.example.index');
        $this->comContexto($actor, $company);
        $this->get(route('admin.users.index'))->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 1)->where('users.data.0.id', $shared->id)
            ->has('users.data.0.companies', 1)->has('companies', 1));
        $this->get(route('admin.users.edit', $foreign))->assertNotFound();
        $data = [
            'name' => $shared->name, 'email' => $shared->email, 'type' => 'user',
            'is_active' => $shared->refresh()->is_active, 'companies' => [$company->id],
            'permissions' => [$permission->module_id => ['list' => true]],
        ];
        $this->put(route('admin.users.update', $shared), $data)->assertSessionHasNoErrors();
        $this->assertDatabaseHas('module_permissions', ['user_id' => $shared->id, 'company_id' => $company->id, 'can_list' => 1]);
        $this->assertTrue(ModulePermission::withoutGlobalScopes()->whereKey($foreignPermission->id)->exists());
        $this->assertCount(2, $shared->companies()->get());
        $this->put(route('admin.users.update', $shared), array_merge($data, ['name' => 'Alterado']))->assertForbidden();
        $this->delete(route('admin.users.destroy', $shared))->assertForbidden();
        $this->post(route('users.toggle-status', $shared))->assertForbidden();
        $this->put(route('admin.users.update', $shared), array_merge($data, [
            'permissions' => [$permission->module_id => ['create' => true]],
        ]))->assertForbidden();
    }

    public function test_failed_save_rolls_back_and_logs_only_diagnostic_fields(): void
    {
        $company = $this->criarEmpresa();
        $actor = $this->criarUsuario($company, 'super_admin');
        $this->concederPermissao($actor, $company, 'admin.users.index', ['create']);
        $this->comContexto($actor, $company);
        Log::spy();
        User::created(static function () {
            throw new \RuntimeException('Mensagem de teste que deve permanecer privada');
        });
        $this->post(route('admin.users.store'), [
            'name' => 'Falha', 'email' => 'falha@example.test', 'type' => 'user',
            'password' => 'Teste@578', 'password_confirmation' => 'Teste@578',
        ])->assertSessionHasErrors('error')->assertSessionMissing('_old_input.password');
        $this->assertDatabaseMissing('users', ['email' => 'falha@example.test']);
        Log::shouldHaveReceived('error')->once()->with('Falha ao gravar conta de usuário', [
            'actor_id' => $actor->id, 'target_id' => null, 'exception_class' => \RuntimeException::class,
        ]);
    }

    public function test_global_admin_can_create_global_identity(): void
    {
        $company = $this->criarEmpresa();
        $actor = $this->criarUsuario($company, 'super_admin');
        $this->concederPermissao($actor, $company, 'admin.users.index', ['create']);
        $this->comContexto($actor, $company);
        $this->post(route('admin.users.store'), [
            'name' => 'Global', 'email' => 'global@example.test', 'type' => 'super_admin',
            'password' => 'Teste@578', 'password_confirmation' => 'Teste@578',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', ['email' => 'global@example.test', 'type' => 'super_admin']);
    }
}
