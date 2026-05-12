<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\View\View;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request)
    {
        return \Inertia\Inertia::render('Admin/Profile/Edit', [
            'user' => array_merge($request->user()->toArray(), [
                'profile_photo_url' => $request->user()->profile_photo_url,
            ]),
            'status' => session('status'),
            'requires_2fa_setup' => !empty(session('google2fa_secret')),
            'two_factor_secret' => session('google2fa_secret'),
            'two_factor_qr_url' => session('google2fa_qr_url'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    public function updatePhoto(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->profile_photo_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->profile_photo_path);
        }

        $path = $request->file('photo')->store('profile-photos', 'public');
        
        $user->forceFill([
            'profile_photo_path' => $path,
        ])->save();

        return Redirect::route('profile.edit')->with('message', 'Foto de perfil atualizada!');
    }

    public function updateLocation(Request $request): RedirectResponse
    {
        $request->validate([
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
        ]);

        $request->user()->forceFill([
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ])->save();

        return Redirect::route('profile.edit')->with('message', 'Localização atualizada com sucesso!');
    }

    public function generate2faSecret(Request $request): RedirectResponse
    {
        $google2fa = new \PragmaRX\Google2FA\Google2FA();
        $secret = $google2fa->generateSecretKey();
        
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $request->user()->email,
            $secret
        );

        // Armazenar temporariamente na sessão para o setup
        session([
            'google2fa_secret' => $secret,
            'google2fa_qr_url' => $qrCodeUrl
        ]);

        return Redirect::route('profile.edit')->with('message', 'Escaneie o QR Code para ativar o 2FA.');
    }

    public function enable2fa(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $secret = session('google2fa_secret');

        if (!$secret) {
            return Redirect::route('profile.edit')->withErrors(['code' => 'Nenhum segredo pendente. Gere o QR code novamente.']);
        }

        $google2fa = new \PragmaRX\Google2FA\Google2FA();

        if ($google2fa->verifyKey($secret, $request->code)) {
            $request->user()->forceFill([
                'google2fa_secret' => $secret,
                'google2fa_enabled' => true,
            ])->save();

            session()->forget(['google2fa_secret', 'google2fa_qr_url']);
            
            return Redirect::route('profile.edit')->with('message', 'Autenticação em 2 fatores habilitada!');
        }

        return Redirect::back()->withErrors(['code' => 'O código informado é inválido. Tente novamente.']);
    }

    public function disable2fa(Request $request): RedirectResponse
    {
        // Require password confirmation could be nice but let's just use regular request validation if needed.
        // To keep it simple, we just disable it since they are logged in.
        $request->user()->forceFill([
            'google2fa_secret' => null,
            'google2fa_enabled' => false,
        ])->save();

        return Redirect::route('profile.edit')->with('message', 'Autenticação em 2 fatores desativada.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validateWithBag('userDeletion', [
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        Auth::logout();
        $user->delete();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
