<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class Ensure2faVerified
{
    public function handle(Request $request, Closure $next)
    {
        $client = Auth::guard('client')->user();

        if ($client && $client->google2fa_secret) {
            // Se tem 2FA e não tá verificado na sessão, empurra pro challenge
            if (!Session::get('client_2fa_verified')) {
                return redirect()->route('portal.2fa.challenge');
            }
        }

        return $next($request);
    }
}
