<?php

namespace App\Support\Jarvis;

use Illuminate\Http\Request;

class CurrentCompanyResolver
{
    public function resolve(Request $request): ?int
    {
        $value = $request->header('X-Company-Id')
            ?? $request->attributes->get('current_company_id')
            ?? session('current_company_id');

        return $value !== null ? (int) $value : null;
    }
}
