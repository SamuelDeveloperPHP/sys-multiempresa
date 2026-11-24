<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use Inertia\Inertia;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\AuditLog;
use App\Models\Client;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Portal/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $throttleKey = 'client-login:'. $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Ataque bloqueado. O acesso está suspenso temporariamente. Tente novamente em {$seconds} segundos.",
            ]);
        }

        if (Auth::guard('client')->attempt($request->only('email', 'password'))) {
            RateLimiter::clear($throttleKey);
            $request->session()->regenerate();
            Session::forget('client_2fa_verified');
            
            $client = Auth::guard('client')->user();
            if ($client->google2fa_secret && $client->two_factor_confirmed_at) {
                return redirect()->route('portal.2fa.challenge');
            }

            return redirect()->route('portal.dashboard');
        }

        RateLimiter::hit($throttleKey, 600); // Penalti de 10 minutos após 3 erros
        
        throw ValidationException::withMessages([
            'email' => 'As credenciais não coincidem com nossos registros.',
        ]);
    }

    public function show2faChallenge()
    {
        return Inertia::render('Portal/TwoFactorChallenge');
    }

    public function verify2fa(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $client = Auth::guard('client')->user();
        $throttleKey = 'client-two-factor:'.$client->id.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $this->auditClient($client, 'two_factor_locked');
            throw ValidationException::withMessages([
                'code' => 'Muitas tentativas. Aguarde '.RateLimiter::availableIn($throttleKey).' segundos.',
            ]);
        }

        $google2fa = new Google2FA();
        
        $code = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $request->string('code')->toString()));
        $valid = ctype_digit($code) && strlen($code) === 6
            && $google2fa->verifyKey($client->google2fa_secret, $code);
        $usedRecoveryCode = false;

        if (! $valid) {
            $usedRecoveryCode = $this->consumeRecoveryCode($client, $code);
            $valid = $usedRecoveryCode;
        }

        if ($valid) {
            RateLimiter::clear($throttleKey);
            $request->session()->regenerate();
            Session::put('client_2fa_verified', true);
            $this->auditClient($client, $usedRecoveryCode ? 'two_factor_recovery_used' : 'two_factor_verified');
            return redirect()->route('portal.dashboard');
        }

        RateLimiter::hit($throttleKey, 60);
        $this->auditClient($client, 'two_factor_failed');
        throw ValidationException::withMessages([
            'code' => 'O código 2FA é inválido ou expirou.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('client')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('portal.login');
    }

    public function show2faSettings()
    {
        /** @var Client $client */
        $client = Auth::guard('client')->user();
        if ($client->two_factor_confirmed_at && ! Session::get('client_2fa_verified')) {
            return redirect()->route('portal.2fa.challenge');
        }

        return Inertia::render('Portal/TwoFactorSettings', [
            'enabled' => (bool) $client->two_factor_confirmed_at,
            'requiresSetup' => Session::has('client_google2fa_secret'),
            'qrCodeUrl' => Session::get('client_google2fa_qr_url'),
            'secret' => Session::get('client_google2fa_secret'),
            'recoveryCodes' => Session::get('client_two_factor_recovery_codes', []),
        ]);
    }

    public function generate2fa(Request $request)
    {
        /** @var Client $client */
        $client = Auth::guard('client')->user();
        if ($client->two_factor_confirmed_at && ! Session::get('client_2fa_verified')) {
            return redirect()->route('portal.2fa.challenge');
        }

        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        Session::put([
            'client_google2fa_secret' => $secret,
            'client_google2fa_qr_url' => $google2fa->getQRCodeUrl(config('app.name').' Portal', $client->email, $secret),
        ]);

        return redirect()->route('portal.2fa.settings');
    }

    public function enable2fa(Request $request)
    {
        $request->validate(['code' => ['required', 'digits:6']]);
        /** @var Client $client */
        $client = Auth::guard('client')->user();
        $secret = Session::get('client_google2fa_secret');

        if (! $secret || ! (new Google2FA())->verifyKey($secret, $request->string('code')->toString())) {
            throw ValidationException::withMessages(['code' => 'O código informado é inválido.']);
        }

        $plainCodes = collect(range(1, 8))->map(fn () => strtoupper(Str::random(5).'-'.Str::random(5)))->values();
        $client->forceFill([
            'google2fa_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $plainCodes
                ->map(fn (string $code) => Hash::make(str_replace('-', '', $code)))->all(),
        ])->save();

        Session::forget(['client_google2fa_secret', 'client_google2fa_qr_url']);
        Session::put('client_2fa_verified', true);
        Session::flash('client_two_factor_recovery_codes', $plainCodes->all());
        $this->auditClient($client, 'two_factor_enabled');

        return redirect()->route('portal.2fa.settings');
    }

    public function disable2fa(Request $request)
    {
        /** @var Client $client */
        $client = Auth::guard('client')->user();
        if ($client->two_factor_confirmed_at && ! Session::get('client_2fa_verified')) {
            return redirect()->route('portal.2fa.challenge');
        }

        if (! $client->two_factor_confirmed_at) {
            Session::forget(['client_google2fa_secret', 'client_google2fa_qr_url']);
            return redirect()->route('portal.2fa.settings');
        }

        $request->validate(['password' => ['required', 'string']]);
        if (! Hash::check($request->string('password')->toString(), $client->password)) {
            throw ValidationException::withMessages(['password' => 'A senha informada está incorreta.']);
        }

        $client->forceFill([
            'google2fa_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();
        Session::forget('client_2fa_verified');
        $this->auditClient($client, 'two_factor_disabled');

        return redirect()->route('portal.2fa.settings');
    }

    private function consumeRecoveryCode(Client $client, string $code): bool
    {
        foreach ($client->two_factor_recovery_codes ?? [] as $index => $hash) {
            if (Hash::check($code, $hash)) {
                $codes = $client->two_factor_recovery_codes;
                unset($codes[$index]);
                $client->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();
                return true;
            }
        }

        return false;
    }

    private function auditClient(Client $client, string $action): void
    {
        try {
            AuditLog::create([
                'company_id' => $client->company_id,
                'module' => 'portal-security',
                'action' => $action,
                'route_name' => request()->route()?->getName(),
                'model_type' => Client::class,
                'model_id' => $client->id,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
