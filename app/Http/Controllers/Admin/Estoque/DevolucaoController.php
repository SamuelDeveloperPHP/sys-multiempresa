<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\DevolucaoRequest;
use App\Models\Estoque\Devolucao;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Devoluções internas — fluxo PENDENTE → APROVADA (gera mov DEVOLUCAO)
 *                                    ↘ REJEITADA
 *
 * Permissões:
 *   - Criar devolução (POST): qualquer usuário autenticado (pode ser o
 *     próprio funcionário ou alguém em nome dele)
 *   - Aprovar/Rejeitar      : requer can_edit no módulo estoque.devolucoes
 *                              + senha do aprovador na hora.
 */
class DevolucaoController extends Controller
{
    // =======================================================================
    // LISTAGEM
    // =======================================================================

    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $userId    = $request->user()->id;

        $query = Devolucao::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->with([
                'funcionario:id,name,email',
                'aprovador:id,name',
                'produto:id,sku,nome,unidade,imagem',
                'obra:id,codigo_obra,nome_fantasia',
                'movimentacaoSaida:id,data_movimento,quantidade',
            ]);

        if ($status = $request->input('status'))    $query->where('status', $status);
        if ($obraId = $request->input('obra_id'))   $query->where('obra_id', $obraId);
        if ($request->boolean('apenas_minhas'))     $query->where('funcionario_user_id', $userId);
        if ($q = $request->input('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('numero', 'like', "%{$q}%")
                  ->orWhere('motivo', 'like', "%{$q}%")
                  ->orWhere('observacao', 'like', "%{$q}%");
            });
        }

        $devolucoes = $query->orderByDesc('id')->simplePaginate(20)->withQueryString();

        $contadores = Devolucao::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')->pluck('total', 'status')->all();

        return Inertia::render('Admin/Estoque/Devolucoes/Index', [
            'devolucoes' => $devolucoes,
            'obras'      => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'contadores' => $contadores,
            'podeAprovar' => $this->usuarioPodeAprovar($request->user()),
            'filtros'    => $request->only(['status', 'obra_id', 'apenas_minhas', 'q']),
        ]);
    }

    public function show(Devolucao $devolucao)
    {
        $this->authorizeCompany($devolucao);

        $devolucao->load([
            'funcionario:id,name,email',
            'aprovador:id,name,email',
            'produto:id,sku,nome,unidade,imagem,valor_unitario',
            'obra:id,codigo_obra,nome_fantasia',
            'movimentacaoSaida:id,data_movimento,quantidade,valor_total',
            'movimentacaoGerada:id,tipo,quantidade',
        ]);

        return Inertia::render('Admin/Estoque/Devolucoes/Show', [
            'devolucao'   => $devolucao,
            'podeAprovar' => $this->usuarioPodeAprovar(request()->user()),
        ]);
    }

    // =======================================================================
    // CRIAR
    // =======================================================================

    public function create()
    {
        $companyId = CompanyContext::current()?->id;
        return Inertia::render('Admin/Estoque/Devolucoes/Form', [
            'obras' => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                          ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
        ]);
    }

    public function store(DevolucaoRequest $request)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de registrar devolução.');

        $data = $request->validated();
        $produto = Produto::find($data['produto_id']);

        $dev = Devolucao::create([
            'company_id'           => $companyId,
            'numero'               => Devolucao::gerarNumero($companyId),
            'funcionario_user_id'  => $data['funcionario_user_id'],
            'produto_id'           => $data['produto_id'],
            'obra_id'              => $data['obra_id'],
            'movimentacao_saida_id' => $data['movimentacao_saida_id'] ?? null,
            'quantidade'           => $data['quantidade'],
            'valor_unitario'       => $data['valor_unitario'] ?? $produto?->valor_unitario ?? 0,
            'estado_material'      => $data['estado_material'],
            'motivo'               => $data['motivo'] ?? null,
            'observacao'           => $data['observacao'] ?? null,
            'status'               => Devolucao::STATUS_PENDENTE,
            'data_criacao'         => now(),
        ]);

        return redirect()->route('admin.estoque.devolucoes.show', $dev)
            ->with('success', "Devolução {$dev->numero} registrada — aguardando aprovação.");
    }

    // =======================================================================
    // APROVAR / REJEITAR (requer senha do aprovador + permissão)
    // =======================================================================

    public function aprovar(Request $request, Devolucao $devolucao)
    {
        $this->authorizeCompany($devolucao);
        $this->mustBeStatus($devolucao, Devolucao::STATUS_PENDENTE);

        $user = $request->user();
        abort_unless($this->usuarioPodeAprovar($user), 403, 'Você não tem permissão para aprovar devoluções.');

        $data = $request->validate([
            'senha_aprovador' => ['required', 'string'],
            'observacao'      => ['nullable', 'string', 'max:1000'],
        ]);

        // Rate limit + valida senha do PRÓPRIO aprovador
        $key = 'estoque-devolucao-aprovar:' . $user->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'senha_aprovador' => 'Muitas tentativas. Aguarde ' . RateLimiter::availableIn($key) . 's.',
            ]);
        }
        if (!Hash::check($data['senha_aprovador'], $user->password)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'senha_aprovador' => 'Senha incorreta.',
            ]);
        }
        RateLimiter::clear($key);

        // Aprova + gera mov DEVOLUCAO em transação
        DB::transaction(function () use ($devolucao, $user, $data) {
            $mov = Movimentacao::create([
                'company_id'        => $devolucao->company_id,
                'produto_id'        => $devolucao->produto_id,
                'obra_id'           => $devolucao->obra_id,
                'tipo'              => Movimentacao::TIPO_DEVOLUCAO,
                'quantidade'        => $devolucao->quantidade,
                'valor_unitario'    => $devolucao->valor_unitario,
                'valor_total'       => $devolucao->valor_total,
                'data_movimento'    => now()->toDateString(),
                'observacao'        => "Devolução interna {$devolucao->numero}" .
                                       ($devolucao->motivo ? " — {$devolucao->motivo}" : ''),
                'movimentacao_origem_id' => $devolucao->movimentacao_saida_id,
                'retirante_user_id' => $devolucao->funcionario_user_id, // quem está devolvendo
                'validacao_method'  => 'SENHA',
                'validado_em'       => now(),
                'user_create'       => $user->email,
            ]);

            $devolucao->update([
                'status'                 => Devolucao::STATUS_APROVADA,
                'aprovador_user_id'      => $user->id,
                'data_aprovacao'         => now(),
                'movimentacao_gerada_id' => $mov->id,
                'observacao'             => $devolucao->observacao
                    . ($data['observacao'] ? "\n[APROVADOR] " . $data['observacao'] : ''),
            ]);
        });

        return back()->with('success', "Devolução {$devolucao->numero} aprovada. Saldo atualizado.");
    }

    public function rejeitar(Request $request, Devolucao $devolucao)
    {
        $this->authorizeCompany($devolucao);
        $this->mustBeStatus($devolucao, Devolucao::STATUS_PENDENTE);

        $user = $request->user();
        abort_unless($this->usuarioPodeAprovar($user), 403, 'Você não tem permissão para rejeitar devoluções.');

        $data = $request->validate([
            'motivo_rejeicao' => ['required', 'string', 'max:2000'],
            'senha_aprovador' => ['required', 'string'],
        ]);

        if (!Hash::check($data['senha_aprovador'], $user->password)) {
            throw ValidationException::withMessages(['senha_aprovador' => 'Senha incorreta.']);
        }

        $devolucao->update([
            'status'             => Devolucao::STATUS_REJEITADA,
            'aprovador_user_id'  => $user->id,
            'data_aprovacao'     => now(),
            'motivo_rejeicao'    => $data['motivo_rejeicao'],
        ]);

        return back()->with('success', "Devolução {$devolucao->numero} rejeitada.");
    }

    // =======================================================================
    // HELPERS
    // =======================================================================

    protected function authorizeCompany(Devolucao $dev): void
    {
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $dev->company_id !== $companyId, 403);
    }

    protected function mustBeStatus(Devolucao $dev, string $status): void
    {
        abort_if($dev->status !== $status, 422, "Devolução já está {$dev->status}.");
    }

    /**
     * O usuário tem permissão pra aprovar devoluções?
     *
     * Regras:
     *   - super_admin sempre pode
     *   - outros precisam de can_edit no módulo estoque.devolucoes
     *     na empresa atual.
     */
    protected function usuarioPodeAprovar(User $user): bool
    {
        if ($user->type === 'super_admin') return true;

        $companyId = CompanyContext::current()?->id;
        if (!$companyId) return false;

        $moduleId = Module::where('slug', 'estoque.devolucoes')->value('id');
        if (!$moduleId) return false;

        return ModulePermission::where('user_id', $user->id)
            ->where('module_id', $moduleId)
            ->where('company_id', $companyId)
            ->where('can_edit', true)
            ->exists();
    }
}
