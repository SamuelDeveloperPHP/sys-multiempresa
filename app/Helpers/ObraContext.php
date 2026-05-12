<?php

namespace App\Helpers;

use App\Models\Obra;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class ObraContext
{
    /**
     * ID da obra ativa na sessão.
     */
    public static function id(): ?int
    {
        $id = Session::get('current_obra_id');

        return $id ? (int) $id : null;
    }

    /**
     * Model Obra da obra ativa (com cache estático por request).
     */
    public static function current(): ?Obra
    {
        static $cached = null;

        $obraId = self::id();

        if (! $obraId) {
            return null;
        }

        if ($cached && $cached->id === $obraId) {
            return $cached;
        }

        return $cached = Obra::find($obraId);
    }

    /**
     * Define a obra ativa na sessão.
     */
    public static function set(Obra|int|null $obra): void
    {
        if ($obra instanceof Obra) {
            Session::put('current_obra_id', $obra->id);
        } elseif (is_int($obra)) {
            Session::put('current_obra_id', $obra);
        } else {
            self::clear();
        }
    }

    /**
     * Remove a obra ativa da sessão.
     */
    public static function clear(): void
    {
        Session::forget('current_obra_id');
    }

    /**
     * Obras às quais o usuário logado tem acesso na empresa atual.
     */
    public static function userObras(): \Illuminate\Database\Eloquent\Collection
    {
        $user      = Auth::user();
        $companyId = CompanyContext::id();

        if (! $user || ! $companyId) {
            return collect();
        }

        if ($user->type === 'super_admin') {
            return Obra::where('company_id', $companyId)
                       ->orderBy('nome_fantasia')
                       ->get();
        }

        return $user->obras()
                    ->where('company_id', $companyId)
                    ->orderBy('nome_fantasia')
                    ->get();
    }

    /**
     * Verifica se o usuário tem acesso à obra informada.
     */
    public static function userCanAccess(int $obraId): bool
    {
        $user      = Auth::user();
        $companyId = CompanyContext::id();

        if (! $user || ! $companyId) {
            return false;
        }

        if ($user->type === 'super_admin') {
            return Obra::where('id', $obraId)
                       ->where('company_id', $companyId)
                       ->exists();
        }

        return $user->obras()
                    ->where('obras.id', $obraId)
                    ->where('company_id', $companyId)
                    ->exists();
    }

    public static function hasCurrent(): bool
    {
        return self::current() !== null;
    }
}
