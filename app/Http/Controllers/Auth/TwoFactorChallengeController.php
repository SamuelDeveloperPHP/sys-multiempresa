<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\TwoFactorAuthentication;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

final class TwoFactorChallengeController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! TwoFactorAuthentication::enabled($user)) {
            return redirect()->route('profile.edit');
        }

        if (TwoFactorAuthentication::verified($request, $user)) {
            return redirect()->to($request->session()->pull('auth.two_factor_intended', '/dashboard'));
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'max:32'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $key = 'two-factor:'.$user->id.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            log_activity('two_factor_locked', [
                'module' => 'user-security',
                'model_type' => $user::class,
                'model_id' => $user->id,
            ]);
            throw ValidationException::withMessages([
                'code' => 'Muitas tentativas. Aguarde '.RateLimiter::availableIn($key).' segundos.',
            ]);
        }

        $code = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $request->string('code')->toString()));
        $valid = ctype_digit($code)
            && strlen($code) === 6
            && (new Google2FA())->verifyKey($user->google2fa_secret, $code);

        $usedRecoveryCode = false;
        if (! $valid) {
            $usedRecoveryCode = $this->consumeRecoveryCode($user, $code);
            $valid = $usedRecoveryCode;
        }

        if (! $valid) {
            RateLimiter::hit($key, 60);
            log_activity('two_factor_failed', [
                'module' => 'user-security',
                'model_type' => $user::class,
                'model_id' => $user->id,
                'after' => ['remaining_attempts' => max(0, 5 - RateLimiter::attempts($key))],
            ]);
            throw ValidationException::withMessages([
                'code' => 'O código informado é inválido ou expirou.',
            ]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();
        TwoFactorAuthentication::markVerified($request, $user);
        log_activity($usedRecoveryCode ? 'two_factor_recovery_used' : 'two_factor_verified', [
            'module' => 'user-security',
            'model_type' => $user::class,
            'model_id' => $user->id,
        ]);

        return redirect()->to($request->session()->pull('auth.two_factor_intended', '/dashboard'));
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        if ($code === '') {
            return false;
        }

        $codes = $user->two_factor_recovery_codes ?? [];
        foreach ($codes as $index => $hash) {
            if (Hash::check($code, $hash)) {
                unset($codes[$index]);
                $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

                return true;
            }
        }

        return false;
    }
}
