<?php

namespace App\Helpers;

use App\Models\Company;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class CompanyContext
{
    /**
     * Pega o ID da empresa atual gravado em sessão.
     */
    public static function id(): ?int
    {
        $id = Session::get('current_company_id');

        return $id ? (int) $id : null;
    }

    /**
     * Retorna o model Company da empresa atual (ou null).
     * Usa um cachezinho estático pra não ficar dando vários SELECTs no mesmo request.
     */
    public static function current(): ?Company
    {
        static $cached = null;

        $companyId = self::id();

        if (!$companyId) {
            return null;
        }

        if ($cached && $cached->id === $companyId) {
            return $cached;
        }

        return $cached = Company::find($companyId);
    }

    /**
     * Define a empresa atual na sessão.
     *
     * Aceita:
     *  - um Company
     *  - um ID
     *  - null (pra limpar)
     */
    public static function set(Company|int|null $company): void
    {
        if ($company instanceof Company) {
            Session::put('current_company_id', $company->id);
        } elseif (is_int($company)) {
            Session::put('current_company_id', $company);
        } else {
            self::clear();
        }
    }

    /**
     * Remove a empresa atual da sessão.
     */
    public static function clear(): void
    {
        Session::forget('current_company_id');
    }

    /**
     * Retorna as empresas vinculadas ao usuário logado.
     * (útil na tela de seleção de empresa, por exemplo)
     */
    public static function userCompanies()
    {
        $user = Auth::user();

        if (!$user) {
            return collect();
        }

        return $user->companies()->orderBy('name')->get();
    }

    /**
     * Helperzinho: verifica se há empresa atual válida.
     */
    public static function hasCurrent(): bool
    {
        return self::current() !== null;
    }
}
