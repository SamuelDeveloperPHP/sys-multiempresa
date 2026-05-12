<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Autenticacao do app mobile (Capacitor) via Sanctum personal access tokens.
 * Em WebView mobile, cookies HTTP-only do Sanctum SPA nao funcionam bem —
 * por isso usamos tokens bearer dedicados ao app.
 *
 * Endpoints:
 *   POST /api/app_login           -> retorna token + perfil + permissoes
 *   POST /api/app_logout          -> revoga o token atual
 *   GET  /api/modulos-permitidos  -> lista de modulos liberados ao usuario na empresa atual
 *
 * Compatibilidade com o app Engeativos (RN): retorna a MESMA shape do payload
 * antigo (`token`, `user`, `data_local`, `dados_func`, `obra_acesso`, `funcao`).
 */
class AppAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Credenciais invalidas'], 401);
        }
        if (!$user->is_active) {
            return response()->json(['message' => 'Usuario inativo'], 403);
        }

        // Token bearer dedicado ao app (escopo "mobile")
        $token = $user->createToken('mobile-app', ['mobile'])->plainTextToken;

        // Atualiza ultimo login
        $user->forceFill(['last_login_at' => now()])->save();

        // Carrega vinculo principal: primeira empresa do usuario + obra padrao
        $company = $user->companies()->first();
        $obra = null;
        if ($company) {
            $obra = $user->obrasForCompany($company->id)->first();
        }

        // Funcionario vinculado (se houver)
        $funcionario = $user->funcionario()->first();
        $funcao = $funcionario?->funcao;

        // Modulos permitidos para a empresa atual
        $modulosPermitidos = $this->listarModulosPermitidos($user, $company?->id);

        return response()->json([
            'token' => $token,
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'biometria' => (bool) $user->biometria,
                'geolocalizacao' => (bool) $user->geolocalizacao,
            ],
            'data_local' => now()->toDateTimeString(),
            'dados_func' => $funcionario,
            'obra_acesso' => $obra,
            'funcao' => $funcao,
            'company' => $company,
            'modulosPermitidos' => $modulosPermitidos,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }
        return response()->json(['message' => 'Logout realizado']);
    }

    public function modulosPermitidos(Request $request): JsonResponse
    {
        $user = $request->user();
        $companyId = (int) $request->query('company_id', 0)
            ?: $user->companies()->value('companies.id');

        return response()->json($this->listarModulosPermitidos($user, $companyId));
    }

    protected function listarModulosPermitidos(User $user, ?int $companyId): array
    {
        if (!$companyId) return [];

        $user->loadPermissions($companyId);
        $cached = $user->modulePermissions()
            ->with('module')
            ->where('company_id', $companyId)
            ->get();

        return $cached
            ->filter(fn ($p) => $p->module)
            ->map(fn ($p) => [
                'id'          => $p->module->id,
                'name'        => $p->module->name,
                'slug'        => $p->module->slug,
                'url'         => $p->module->url,
                'icon'        => $p->module->icon ?? null,
                'parent_id'   => $p->module->parent_id ?? null,
                'can_view'    => (bool) $p->can_view,
                'can_create'  => (bool) $p->can_create,
                'can_update'  => (bool) ($p->can_update ?? false),
                'can_delete'  => (bool) ($p->can_delete ?? false),
            ])
            ->values()
            ->all();
    }
}
