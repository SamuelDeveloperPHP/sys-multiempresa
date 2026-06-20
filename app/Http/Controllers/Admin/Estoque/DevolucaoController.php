<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\DevolucaoRequest;
use App\Models\Estoque\Devolucao;
use App\Models\Estoque\Lote;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Funcionario;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\Obra;
use App\Models\User;
use App\Services\Estoque\RetiranteValidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
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

        // EPI: se a devolução referencia uma saída, devolve para a mesma
        // variante/lote de origem.
        $saidaOrigem = $devolucao->movimentacao_saida_id
            ? Movimentacao::find($devolucao->movimentacao_saida_id)
            : null;

        // Aprova + gera mov DEVOLUCAO em transação
        DB::transaction(function () use ($devolucao, $user, $data, $saidaOrigem) {
            $mov = Movimentacao::create([
                'company_id'        => $devolucao->company_id,
                'produto_id'        => $devolucao->produto_id,
                'variante_id'       => $saidaOrigem?->variante_id,
                'lote_id'           => $saidaOrigem?->lote_id,
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

            // EPI: restaura a quantidade ao lote de origem
            if ($saidaOrigem?->lote_id) {
                Lote::where('id', $saidaOrigem->lote_id)
                    ->increment('quantidade_atual', (float) $devolucao->quantidade);
            }

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
    // FLUXO RÁPIDO POR FUNCIONÁRIO (Fase 2)
    //
    //   Operador escolhe uma SAÍDA em aberto onde o retirante é um
    //   FUNCIONÁRIO. O sistema mostra os dados, o funcionário digita sua
    //   senha de retirada, e a devolução é criada já APROVADA (sem aprovador,
    //   sem workflow). A movimentação DEVOLUCAO é gerada na hora e o saldo
    //   atualizado pelo observer.
    //
    //   Regra essencial: SÓ O MESMO FUNCIONÁRIO que retirou pode devolver.
    // =======================================================================

    /**
     * GET /admin/estoque/devolucoes/rapida — tela do fluxo rápido.
     * Lista as saídas elegíveis (retirante = funcionário) ainda sem
     * devolução total registrada.
     */
    public function rapidaCreate(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        $saidasAbertas = Movimentacao::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where('tipo', Movimentacao::TIPO_SAIDA)
            ->whereNotNull('retirante_funcionario_id')
            ->with([
                'produto:id,sku,nome,unidade',
                'obra:id,codigo_obra,nome_fantasia',
                'retiranteFuncionario:id,nome,matricula,cpf,imagem_usuario,senha_retirada',
            ])
            // Soma a quantidade já devolvida desta saída
            // (DEVOLUCAOs cujo movimentacao_origem_id = saida.id).
            ->withSum('devolucoesFeitas as ja_devolvido', 'quantidade')
            ->orderByDesc('data_movimento')
            ->limit(200)
            ->get();

        // Calcula quanto ainda pode ser devolvido (quantidade - já_devolvido)
        $saidas = $saidasAbertas->map(function ($m) {
            $jaDev = (float) ($m->ja_devolvido ?? 0);
            $restante = max(0, (float) $m->quantidade - $jaDev);
            return [
                'id'              => $m->id,
                'data_movimento'  => $m->data_movimento?->format('Y-m-d'),
                'quantidade'      => (float) $m->quantidade,
                'ja_devolvido'    => $jaDev,
                'qtd_restante'    => $restante,
                'valor_unitario'  => (float) $m->valor_unitario,
                'produto'         => $m->produto,
                'obra'            => $m->obra,
                'retirante'       => $m->retiranteFuncionario ? [
                    'id'             => $m->retiranteFuncionario->id,
                    'nome'           => $m->retiranteFuncionario->nome,
                    'matricula'      => $m->retiranteFuncionario->matricula,
                    'cpf'            => $m->retiranteFuncionario->cpf,
                    'imagem_usuario' => $m->retiranteFuncionario->imagem_usuario,
                    'tem_senha'      => !empty($m->retiranteFuncionario->senha_retirada),
                ] : null,
            ];
        })->filter(fn ($x) => $x['qtd_restante'] > 0)->values();

        return Inertia::render('Admin/Estoque/Devolucoes/Rapida', [
            'saidas_abertas' => $saidas,
        ]);
    }

    /**
     * POST /admin/estoque/devolucoes/rapida — registra devolução APROVADA
     * autenticada pelo próprio funcionário que retirou.
     */
    public function rapidaStore(Request $request, RetiranteValidator $validator)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de devolver.');

        $data = $request->validate([
            'movimentacao_saida_id' => ['required', 'integer', Rule::exists('estoque_movimentacoes', 'id')],
            'quantidade'            => ['required', 'numeric', 'gt:0'],
            'estado_material'       => ['required', Rule::in(['NOVO', 'USADO_OK', 'AVARIADO'])],
            'motivo'                => ['nullable', 'string', 'max:500'],
            'observacao'            => ['nullable', 'string', 'max:1000'],
            // Senha do MESMO funcionário que retirou
            'senha_funcionario'     => ['required', 'string'],
        ]);

        $saida = Movimentacao::with('retiranteFuncionario')->find($data['movimentacao_saida_id']);
        if (!$saida || $saida->company_id !== $companyId) abort(404, 'Saída não encontrada.');
        if ($saida->tipo !== Movimentacao::TIPO_SAIDA) abort(422, 'Movimentação não é uma saída.');
        if (!$saida->retirante_funcionario_id) {
            throw ValidationException::withMessages([
                'movimentacao_saida_id' => 'Esta saída não foi feita por funcionário sem login. Use o fluxo normal de devolução.',
            ]);
        }

        // Calcula saldo devolvível (não permite devolver mais do que retirou)
        $jaDevolvido = (float) Devolucao::where('movimentacao_saida_id', $saida->id)
            ->where('status', Devolucao::STATUS_APROVADA)
            ->sum('quantidade');
        $restante = (float) $saida->quantidade - $jaDevolvido;
        if ((float) $data['quantidade'] > $restante + 0.0001) {
            throw ValidationException::withMessages([
                'quantidade' => sprintf(
                    'Quantidade excede o saldo devolvível desta saída. Restante: %s (já devolvido: %s).',
                    number_format($restante, 3, ',', '.'),
                    number_format($jaDevolvido, 3, ',', '.')
                ),
            ]);
        }

        // Valida senha do MESMO funcionário
        $func = $validator->validarFuncionario(
            (int) $saida->retirante_funcionario_id,
            (string) $data['senha_funcionario'],
            'senha_funcionario'
        );

        // Cria devolução APROVADA + movimentação DEVOLUCAO em transação
        $dev = DB::transaction(function () use ($saida, $data, $func, $companyId) {
            $mov = Movimentacao::create([
                'company_id'              => $companyId,
                'produto_id'              => $saida->produto_id,
                // EPI: devolve para a mesma variante/lote de origem
                'variante_id'             => $saida->variante_id,
                'lote_id'                 => $saida->lote_id,
                'obra_id'                 => $saida->obra_id,
                'tipo'                    => Movimentacao::TIPO_DEVOLUCAO,
                'quantidade'              => $data['quantidade'],
                'valor_unitario'          => $saida->valor_unitario,
                'valor_total'             => (float) $data['quantidade'] * (float) $saida->valor_unitario,
                'data_movimento'          => now()->toDateString(),
                'observacao'              => 'Devolução rápida — autenticada pelo funcionário '
                                              . $func->nome
                                              . ($data['motivo'] ?? '' ? " — {$data['motivo']}" : ''),
                'movimentacao_origem_id'  => $saida->id,
                'retirante_funcionario_id'=> $func->id,
                'validacao_method'        => 'SENHA_FUNC',
                'validado_em'             => now(),
                'user_create'             => Auth::user()->email,
            ]);

            // EPI: devolve a quantidade de volta ao lote de origem (FEFO)
            if ($saida->lote_id) {
                Lote::where('id', $saida->lote_id)
                    ->increment('quantidade_atual', (float) $data['quantidade']);
            }

            return Devolucao::create([
                'company_id'             => $companyId,
                'numero'                 => Devolucao::gerarNumero($companyId),
                'funcionario_id'         => $func->id,        // Fase 2: funcionário sem login
                'produto_id'             => $saida->produto_id,
                'obra_id'                => $saida->obra_id,
                'movimentacao_saida_id'  => $saida->id,
                'movimentacao_gerada_id' => $mov->id,
                'quantidade'             => $data['quantidade'],
                'valor_unitario'         => $saida->valor_unitario,
                'estado_material'        => $data['estado_material'],
                'motivo'                 => $data['motivo'] ?? null,
                'observacao'             => $data['observacao'] ?? null,
                // Vai DIRETO para APROVADA (não passa pelo workflow)
                'status'                 => Devolucao::STATUS_APROVADA,
                'data_criacao'           => now(),
                'aprovador_user_id'      => Auth::id(),
                'data_aprovacao'         => now(),
            ]);
        });

        Log::info('Estoque: DEVOLUCAO rápida registrada', [
            'devolucao_id'   => $dev->id,
            'saida_id'       => $saida->id,
            'funcionario_id' => $func->id,
            'qtd'            => $data['quantidade'],
            'operador'       => Auth::user()->email,
        ]);

        return redirect()
            ->route('admin.estoque.devolucoes.show', $dev)
            ->with('success', "Devolução {$dev->numero} registrada e aprovada. Saldo atualizado.");
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
