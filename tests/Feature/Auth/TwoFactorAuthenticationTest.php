<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Support\TwoFactorAuthentication;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_privileged_user_must_configure_two_factor_authentication(): void
    {
        $user = User::factory()->create(['type' => 'manager']);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('profile.edit'));
        $this->get('/dashboard')->assertRedirect(route('profile.edit'));
    }

    public function test_optional_user_can_login_without_two_factor_authentication(): void
    {
        $user = User::factory()->create(['type' => 'user']);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect('/dashboard');
    }

    public function test_enabled_user_is_challenged_and_valid_totp_completes_login(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create([
            'type' => 'manager',
            'google2fa_enabled' => true,
            'google2fa_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect(route('two-factor.challenge'));

        $this->get('/dashboard')->assertRedirect(route('two-factor.challenge'));

        $this->post(route('two-factor.verify'), [
            'code' => $google2fa->getCurrentOtp($secret),
        ])->assertRedirect('/dashboard');

        $this->assertSame($user->id, session(TwoFactorAuthentication::SESSION_USER_KEY));
    }

    public function test_activation_generates_recovery_codes_without_touching_permissions(): void
    {
        $user = User::factory()->create(['type' => 'manager']);
        $permissionCount = DB::table('module_permissions')->count();

        $this->be($user);
        $this->post(route('profile.2fa.generate'))->assertRedirect(route('profile.edit'));
        $secret = session('google2fa_secret');

        $this->post(route('profile.2fa.enable'), [
            'code' => (new Google2FA())->getCurrentOtp($secret),
        ])->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertTrue($user->google2fa_enabled);
        $this->assertNotNull($user->two_factor_confirmed_at);
        $this->assertCount(8, $user->two_factor_recovery_codes);
        $this->assertCount(8, session('two_factor_recovery_codes'));
        $this->assertSame($permissionCount, DB::table('module_permissions')->count());
    }

    public function test_recovery_code_is_single_use(): void
    {
        $secret = (new Google2FA())->generateSecretKey();
        $user = User::factory()->create([
            'type' => 'manager',
            'google2fa_enabled' => true,
            'google2fa_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [Hash::make('ABCDE12345')],
        ]);

        $this->actingAs($user)->post(route('two-factor.verify'), [
            'code' => 'ABCDE-12345',
        ])->assertRedirect('/dashboard');

        $this->assertSame([], $user->fresh()->two_factor_recovery_codes);

        session()->forget([
            TwoFactorAuthentication::SESSION_USER_KEY,
            TwoFactorAuthentication::SESSION_TIME_KEY,
        ]);
        $this->post(route('two-factor.verify'), [
            'code' => 'ABCDE-12345',
        ])->assertSessionHasErrors('code');
    }

    public function test_verified_session_expires_after_seven_days(): void
    {
        $secret = (new Google2FA())->generateSecretKey();
        $user = User::factory()->create([
            'type' => 'manager',
            'google2fa_enabled' => true,
            'google2fa_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->be($user);
        $this->withSession([
            TwoFactorAuthentication::SESSION_USER_KEY => $user->id,
            TwoFactorAuthentication::SESSION_TIME_KEY => now()->subDays(8)->toIso8601String(),
        ]);

        $this->get('/dashboard')->assertRedirect(route('two-factor.challenge'));
    }

    public function test_sensitive_authentication_fields_are_hidden_from_serialization(): void
    {
        $user = User::factory()->make([
            'google2fa_secret' => 'secret',
            'password_app' => 'offline-hash',
            'perfil_offline' => '{}',
            'two_factor_recovery_codes' => ['hash'],
        ]);

        $serialized = $user->toArray();

        $this->assertArrayNotHasKey('google2fa_secret', $serialized);
        $this->assertArrayNotHasKey('password_app', $serialized);
        $this->assertArrayNotHasKey('perfil_offline', $serialized);
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $serialized);
    }
}
