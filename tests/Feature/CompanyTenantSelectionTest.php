<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CompanyTenantSelectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_select_a_company_without_membership(): void
    {
        $user = User::factory()->create(['type' => 'manager']);
        $company = Company::create(['name' => 'Other company', 'slug' => 'other-company']);

        $this->actingAs($user)
            ->post(route('companies.set'), ['company_id' => $company->id])
            ->assertForbidden()
            ->assertSessionMissing('current_company_id');
    }

    public function test_user_can_select_a_linked_company(): void
    {
        $user = User::factory()->create(['type' => 'manager']);
        $company = Company::create(['name' => 'Member company', 'slug' => 'member-company']);
        DB::table('company_user')->insert([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'role' => 'member',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->post(route('companies.set'), ['company_id' => $company->id])
            ->assertRedirect()
            ->assertSessionHas('current_company_id', $company->id);
    }

    public function test_user_cannot_select_an_unlinked_worksite_in_a_linked_company(): void
    {
        $user = User::factory()->create(['type' => 'manager']);
        $company = Company::create(['name' => 'Member company', 'slug' => 'member-company']);
        $obra = Obra::create(['company_id' => $company->id, 'nome_fantasia' => 'Restricted worksite']);
        DB::table('company_user')->insert([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'role' => 'member',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->post(route('companies.set'), [
                'company_id' => $company->id,
                'obra_id' => $obra->id,
            ])
            ->assertForbidden()
            ->assertSessionMissing('current_company_id');
    }

    public function test_mobile_api_requires_a_valid_company_context(): void
    {
        $user = User::factory()->create(['type' => 'manager']);

        $this->actingAs($user)
            ->getJson('/api/mobile/veiculos')
            ->assertForbidden()
            ->assertJsonPath('code', 'company_context_required');
    }
}
