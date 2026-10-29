<?php

namespace Tests\Feature\Frota;

use App\Http\Middleware\UpdateLastSeen;
use App\Models\Company;
use App\Models\Frota\Veiculo;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class AdminFrotaTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(UpdateLastSeen::class);
    }

    protected function criarEmpresa(string $nome = 'Empresa Frota'): Company
    {
        return Company::create([
            'name' => $nome,
            'slug' => fake()->unique()->slug(2),
            'is_active' => true,
        ]);
    }

    protected function criarUsuario(Company $company, string $type = 'admin'): User
    {
        $user = User::factory()->create([
            'type' => $type,
        ]);

        $user->companies()->attach($company->id, ['role' => $type]);

        return $user;
    }

    protected function criarVeiculo(Company $company, array $attributes = []): Veiculo
    {
        return Veiculo::withoutGlobalScopes()->create(array_merge([
            'company_id' => $company->id,
            'prefixo' => 'FRT-' . fake()->unique()->numerify('###'),
            'placa' => strtoupper(fake()->unique()->bothify('???#?##')),
            'situacao' => 'Ativo',
            'tipo_km' => true,
        ], $attributes));
    }

    protected function concederPermissao(
        User $user,
        Company $company,
        string $routeName,
        array $abilities = ['list'],
    ): ModulePermission {
        $module = Module::create([
            'name' => 'Frota - ' . $routeName,
            'slug' => str_replace('.', '-', $routeName),
            'route_name' => $routeName,
            'is_active' => true,
            'show_in_menu' => true,
        ]);

        $permission = [
            'company_id' => $company->id,
            'user_id' => $user->id,
            'module_id' => $module->id,
            'can_list' => false,
            'can_view' => false,
            'can_create' => false,
            'can_edit' => false,
            'can_delete' => false,
        ];

        foreach ($abilities as $ability) {
            $permission["can_{$ability}"] = true;
        }

        return ModulePermission::withoutGlobalScopes()->create($permission);
    }

    protected function comContexto(User $user, Company $company): static
    {
        return $this->actingAs($user)
            ->withSession(['current_company_id' => $company->id]);
    }
}
