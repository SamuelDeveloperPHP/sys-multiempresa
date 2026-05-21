<?php

namespace App\Http\Controllers;

use App\Models\Funcionario;
use Illuminate\Database\Eloquent\Builder;

/**
 * Página pública do funcionário — destino do QR Code do crachá.
 * Sem autenticação. Mostra apenas dados públicos de identificação.
 */
class PublicFuncionarioController extends Controller
{
    public function show(int $id)
    {
        // Bypass do CompanyScope global — esta é uma página pública,
        // o tenant é determinado pelo próprio funcionário consultado.
        $funcionario = Funcionario::withoutGlobalScopes()
            ->with(['funcao', 'setor', 'obra', 'company'])
            ->where('id', $id)
            ->where('status', 'Ativo')
            ->first();

        if (! $funcionario) {
            abort(404, 'Funcionário não encontrado ou inativo.');
        }

        return view('public.funcionario', compact('funcionario'));
    }
}
