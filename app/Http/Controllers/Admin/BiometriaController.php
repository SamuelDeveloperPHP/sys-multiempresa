<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laragear\WebAuthn\Http\Requests\AttestationRequest;
use Laragear\WebAuthn\Http\Requests\AttestedRequest;
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

    // =======================================================================
    // CADASTRO DE BIOMETRIA DE TERCEIROS (almoxarife → funcionários)
    // Usado quando o terminal do almoxarifado cadastra digitais de vários
    // funcionários presencialmente.
    // =======================================================================

    /**
     * Tela de listagem: funcionários + status biométrico + botão "cadastrar".
     */
    public function funcionariosIndex(Request $request)
    {
        $this->autorizarCadastrarTerceiros($request->user());

        $busca = trim($request->input('q', ''));
        $query = User::query()
            ->select('id', 'name', 'email', 'type')
            ->whereNull('deleted_at')
            ->where('type', '!=', 'motorista')  // motorista usa app mobile próprio
            ->orderBy('name');

        if ($busca) {
            $query->where(function ($w) use ($busca) {
                $w->where('name', 'like', "%{$busca}%")
                  ->orWhere('email', 'like', "%{$busca}%");
            });
        }

        $users = $query->limit(200)->get();

        // Mapa de credenciais ativas por user (1 query, evita N+1)
        $userClass = User::class;
        $counts = WebAuthnCredential::query()
            ->where('authenticatable_type', $userClass)
            ->whereIn('authenticatable_id', $users->pluck('id'))
            ->whereNull('disabled_at')
            ->selectRaw('authenticatable_id, COUNT(*) as total')
            ->groupBy('authenticatable_id')
            ->pluck('total', 'authenticatable_id')
            ->all();

        $lista = $users->map(fn ($u) => [
            'id'                => $u->id,
            'name'              => $u->name,
            'email'             => $u->email,
            'type'              => $u->type,
            'total_credenciais' => (int) ($counts[$u->id] ?? 0),
            'atende_requisito'  => ((int) ($counts[$u->id] ?? 0)) >= 2,
        ]);

        return Inertia::render('Admin/Estoque/BiometriaFuncionarios/Index', [
            'funcionarios'   => $lista,
            'busca'          => $busca,
            'totalCompletos' => $lista->where('atende_requisito', true)->count(),
            'totalParciais'  => $lista->where('total_credenciais', 1)->count(),
            'totalZero'      => $lista->where('total_credenciais', 0)->count(),
        ]);
    }

    /**
     * Gera challenge WebAuthn para cadastrar uma credencial no funcionário-alvo.
     * O operador (request user) precisa ter permissão de "almoxarife" ou super_admin.
     *
     * Estratégia: usa Auth::setUser() temporário pra forçar o AttestationRequest
     * a montar as opções para o funcionário-alvo (e não pro operador logado).
     */
    public function funcionarioOptions(Request $request, AttestationRequest $attestation, User $funcionario)
    {
        $this->autorizarCadastrarTerceiros($request->user());

        // "Loga" temporariamente como o funcionário só pra essa request — não
        // persiste em cookie. AttestationRequest vai usar o $request->user()
        // que agora aponta para o funcionário-alvo.
        Auth::setUser($funcionario);
        $request->setUserResolver(fn () => $funcionario);

        return $attestation->fastRegistration()->toCreate();
    }

    /**
     * Grava a credencial WebAuthn no funcionário-alvo.
     */
    public function funcionarioRegister(AttestedRequest $attested, Request $request, User $funcionario)
    {
        $this->autorizarCadastrarTerceiros($request->user());

        Auth::setUser($funcionario);
        $request->setUserResolver(fn () => $funcionario);

        $attested->save();

        return response()->noContent();
    }

    /**
     * Revoga credencial de um funcionário (almoxarife pode revogar
     * digital de qualquer funcionário se tiver perdido confiança/funcionário saiu).
     */
    public function funcionarioRevogarCredencial(Request $request, User $funcionario, string $credentialId)
    {
        $this->autorizarCadastrarTerceiros($request->user());

        $cred = WebAuthnCredential::where('authenticatable_type', User::class)
            ->where('authenticatable_id', $funcionario->id)
            ->where('id', $credentialId)
            ->first();

        abort_if(!$cred, 404, 'Credencial não encontrada.');
        $cred->delete();

        return back()->with('success', "Biometria de {$funcionario->name} revogada.");
    }

    /**
     * Verifica se o usuário operador pode cadastrar biometria para outros.
     *
     * Regras:
     *   - super_admin SEMPRE pode (regra global)
     *   - outros: precisam de can_create no módulo estoque.devolucoes
     *     em pelo menos UMA empresa (os "almoxarifes" cadastrados em /almoxarifes)
     */
    protected function autorizarCadastrarTerceiros(User $operador): void
    {
        if ($operador->type === 'super_admin') return;

        $module = Module::where('slug', 'estoque.devolucoes')->first();
        if (!$module) {
            abort(403, 'Permissão indisponível: módulo estoque.devolucoes não cadastrado.');
        }

        $temPermissao = ModulePermission::where('user_id', $operador->id)
            ->where('module_id', $module->id)
            ->where('can_create', true)
            ->exists();

        abort_unless($temPermissao, 403, 'Apenas super-admin ou almoxarifes podem cadastrar biometria de outros funcionários.');
    }
}
