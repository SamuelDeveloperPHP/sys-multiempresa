<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laragear\WebAuthn\Models\WebAuthnCredential;

/**
 * Gestão de credenciais WebAuthn (biometria) do usuário logado.
 *
 * Cada credencial = 1 cadastro de digital. Para usar biometria como
 * método de validação de retirada de estoque, o funcionário deve ter
 * AO MENOS 2 credenciais cadastradas (política de redundância — se um
 * dedo machucar/sujar, ainda dá pra usar o outro).
 *
 * O cadastro em si é feito via @laragear/webauthn no frontend (chama
 * /webauthn/register/options e /webauthn/register). Este controller
 * apenas LISTA, REMOVE e checa STATUS.
 */
class BiometriaController extends Controller
{
    /**
     * Lista as credenciais do usuário logado para gerenciar.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $credenciais = WebAuthnCredential::query()
            ->where('authenticatable_type', get_class($user))
            ->where('authenticatable_id', $user->id)
            ->orderByDesc('created_at')
            ->get(['id', 'alias', 'created_at', 'disabled_at', 'origin', 'rp_id']);

        return Inertia::render('Admin/Perfil/Biometria', [
            'credenciais'     => $credenciais,
            'totalAtivas'     => $credenciais->whereNull('disabled_at')->count(),
            'atendeRequisito' => $credenciais->whereNull('disabled_at')->count() >= 2,
        ]);
    }

    /**
     * Revoga uma credencial específica (só do próprio user).
     */
    public function destroy(Request $request, string $credentialId)
    {
        $user = $request->user();
        $cred = WebAuthnCredential::where('authenticatable_type', get_class($user))
            ->where('authenticatable_id', $user->id)
            ->where('id', $credentialId)
            ->first();

        abort_if(!$cred, 404, 'Credencial não encontrada.');

        $cred->delete();

        return back()->with('success', 'Biometria revogada.');
    }

    /**
     * Endpoint AJAX — retorna status da biometria de QUALQUER usuário
     * (consulta pública pra exibir aviso na tela de saída de estoque).
     *
     * NÃO retorna dados sensíveis — apenas contadores.
     */
    public function statusUsuario(Request $request, int $userId)
    {
        $user = \App\Models\User::find($userId);
        if (!$user) {
            return response()->json(['existe' => false]);
        }
        $total = WebAuthnCredential::where('authenticatable_type', get_class($user))
            ->where('authenticatable_id', $userId)
            ->whereNull('disabled_at')
            ->count();

        return response()->json([
            'existe'           => true,
            'total_credenciais' => $total,
            'atende_requisito' => $total >= 2,
            'nivel'            => $total === 0 ? 'sem_biometria'
                                : ($total === 1 ? 'incompleta' : 'completa'),
        ]);
    }
}
