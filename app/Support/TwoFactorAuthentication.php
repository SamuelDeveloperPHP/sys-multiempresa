<?php

namespace App\Support;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

final class TwoFactorAuthentication
{
    public const REQUIRED_TYPES = ['super_admin', 'admin', 'manager'];

    public const VERIFICATION_TTL_HOURS = 168;

    public const SESSION_USER_KEY = 'auth.two_factor_verified_user_id';

    public const SESSION_TIME_KEY = 'auth.two_factor_verified_at';

    public const SESSION_TEST_COMPLETE_KEY = 'auth.two_factor_test_complete';

    public static function required(User $user): bool
    {
        return in_array($user->type, self::REQUIRED_TYPES, true);
    }

    public static function enabled(User $user): bool
    {
        return (bool) $user->google2fa_enabled
            && filled($user->google2fa_secret)
            && $user->two_factor_confirmed_at !== null;
    }

    public static function verified(Request $request, User $user): bool
    {
        if ((int) $request->session()->get(self::SESSION_USER_KEY) !== (int) $user->id) {
            return false;
        }

        $verifiedAt = $request->session()->get(self::SESSION_TIME_KEY);
        if (! is_string($verifiedAt)) {
            return false;
        }

        try {
            $valid = CarbonImmutable::parse($verifiedAt)->isAfter(now()->subHours(self::VERIFICATION_TTL_HOURS));
        } catch (\Throwable) {
            $valid = false;
        }

        if (! $valid) {
            self::forget($request);
        }

        return $valid;
    }

    public static function markVerified(Request $request, User $user): void
    {
        $request->session()->put([
            self::SESSION_USER_KEY => $user->id,
            self::SESSION_TIME_KEY => now()->toIso8601String(),
        ]);
    }

    public static function forget(Request $request): void
    {
        $request->session()->forget([
            self::SESSION_USER_KEY,
            self::SESSION_TIME_KEY,
        ]);
    }
}
