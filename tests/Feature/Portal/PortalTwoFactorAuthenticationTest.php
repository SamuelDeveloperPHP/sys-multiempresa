<?php

namespace Tests\Feature\Portal;

use App\Models\Client;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class PortalTwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_enable_and_disable_two_factor_authentication(): void
    {
        $client = $this->client();

        $this->actingAs($client, 'client')
            ->post(route('portal.2fa.generate'))
            ->assertRedirect(route('portal.2fa.settings'));

        $secret = session('client_google2fa_secret');
        $this->post(route('portal.2fa.enable'), [
            'code' => (new Google2FA())->getCurrentOtp($secret),
        ])->assertRedirect(route('portal.2fa.settings'));

        $client->refresh();
        $this->assertNotNull($client->two_factor_confirmed_at);
        $this->assertCount(8, $client->two_factor_recovery_codes);
        $this->assertDatabaseHas('audit_logs', ['action' => 'two_factor_enabled', 'model_id' => $client->id]);

        $this->post(route('portal.2fa.disable'), ['password' => 'password'])
            ->assertRedirect(route('portal.2fa.settings'));

        $this->assertNull($client->fresh()->two_factor_confirmed_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'two_factor_disabled', 'model_id' => $client->id]);
    }

    public function test_client_recovery_code_is_single_use(): void
    {
        $client = $this->client();
        $client->forceFill([
            'google2fa_secret' => (new Google2FA())->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [Hash::make('ABCDE12345')],
        ])->save();

        $this->actingAs($client, 'client')->post(route('portal.2fa.challenge'), [
            'code' => 'ABCDE-12345',
        ])->assertRedirect(route('portal.dashboard'));

        $this->assertSame([], $client->fresh()->two_factor_recovery_codes);
        $this->assertDatabaseHas('audit_logs', ['action' => 'two_factor_recovery_used', 'model_id' => $client->id]);
    }

    private function client(): Client
    {
        $company = Company::create(['name' => 'Cliente Portal', 'slug' => 'cliente-portal', 'is_active' => true]);

        return Client::create([
            'company_id' => $company->id,
            'name' => 'Cliente Teste',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
        ]);
    }
}
