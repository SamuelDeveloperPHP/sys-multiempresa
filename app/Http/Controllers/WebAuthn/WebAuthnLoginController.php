<?php

namespace App\Http\Controllers\WebAuthn;

use App\Models\User;
use App\Support\TwoFactorAuthentication;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Laragear\WebAuthn\Http\Requests\AssertedRequest;
use Laragear\WebAuthn\Http\Requests\AssertionRequest;

use function response;

class WebAuthnLoginController
{
    /**
     * Returns the challenge to assertion.
     */
    public function options(AssertionRequest $request): Responsable
    {
        return $request->toVerify($request->validate(['email' => 'sometimes|email|string']));
    }

    /**
     * Log the user in.
     */
    public function login(AssertedRequest $request): Response
    {
        if (! $request->login()) {
            return response()->noContent(422);
        }

        $user = Auth::user();
        if (! $user instanceof User || ! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->noContent(403);
        }

        $request->session()->regenerate();
        TwoFactorAuthentication::forget($request);
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->noContent();
    }
}
