<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\MovimentacaoRequest;
use App\Models\Estoque\Categoria;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\Saldo;
use App\Models\Fornecedor;
use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Movimentações de estoque — entrada / saída / transferência entre obras.
 *
 * Saldo é atualizado automaticamente pelo EstoqueMovimentacaoObserver
 * (que mantém estoque_saldos em sync).
 *
 * Transferência: o store() cria DOIS registros em transação:
 *   - TRANSF_OUT na obra de origem
 *   - TRANSF_IN  na obra de destino
 * vinculados pelo campo movimentacao_par_id.
 */
class MovimentacaoController extends Controller
{
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        $query = Movimentacao::query()
            ->with(['produto:id,sku,nome,unidade', 'obra:id,codigo_obra,nome_fantasia', 'obraContraparte:id,codigo_obra,nome_fantasia', 'fornecedor:id,razao_social']);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        if ($tipo = $request->input('tipo')) {
            $query->where('tipo', $tipo);
        }
        if ($obraId = $request->input('obra_id')) {
            $query->where('obra_id', $obraId);
        }
        if ($produtoId = $request->input('produto_id')) {
            $query->where('produto_id', $produtoId);
        }
        if ($q = $request->input('q')) {
            $query->whereHas('produto', function ($w) use ($q) {
                $w->where('nome', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%");
            });
        }
        if ($de = $request->input('data_de')) {
            $query->whereDate('data_movimento', '>=', $de);
        }
        if ($ate = $request->input('data_ate')) {
            $query->whereDate('data_movimento', '<=', $ate);
        }

        // simplePaginate evita COUNT(*) caro quando a tabela crescer.
        // Ordena por id desc (que é praticamente equivalente a data desc
        // já que id é serial).
        $movimentacoes = $query->orderByDesc('id')
            ->simplePaginate(25)->withQueryString();

        return Inertia::render('Admin/Estoque/Movimentacoes/Index', [
            'movimentacoes' => $movimentacoes,
            'obras'         => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'tiposLabels'   => $this->tiposLabels(),
            'filtros'       => $request->only(['tipo', 'obra_id', 'produto_id', 'q', 'data_de', 'data_ate']),
        ]);
    }

    public function create(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $tipo = $request->input('tipo', Movimentacao::TIPO_ENTRADA);

        return Inertia::render('Admin/Estoque/Movimentacoes/Form', [
            'tipoInicial'  => $tipo,
            'obras'        => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'fornecedores' => Fornecedor::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                ->orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    public function show(Movimentacao $movimentacao)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $movimentacao->company_id !== $companyId, 403);

        $movimentacao->load([
            'produto:id,sku,nome,unidade,imagem',
            'obra:id,codigo_obra,nome_fantasia',
            'obraContraparte:id,codigo_obra,nome_fantasia',
            'fornecedor:id,razao_social,nome_fantasia',
            'par',
            'retirante:id,name,email',
            'retiranteFuncionario:id,nome,matricula,cpf,imagem_usuario',
            'origem:id,tipo,quantidade,data_movimento',
        ]);

        return Inertia::render('Admin/Estoque/Movimentacoes/Show', [
            'movimentacao' => $movimentacao,
        ]);
    }

    public function store(MovimentacaoRequest $request)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de lançar movimentação.');

        $userEmail = $request->user()->email;
        $data      = $request->validated();

        // Auto-preenche valor_total a partir de quantidade × unitário (se não veio)
        $valorTotal = (float) ($data['quantidade'] ?? 0) * (float) ($data['valor_unitario'] ?? 0);

        if ($data['tipo'] === Movimentacao::TIPO_TRANSF_OUT) {
            // ============= TRANSFERÊNCIA =============
            // Gera par TRANSF_OUT (origem) + TRANSF_IN (destino) em transação.
            $mov = DB::transaction(function () use ($data, $valorTotal, $companyId, $userEmail) {
                $out = Movimentacao::create([
                    'company_id'          => $companyId,
                    'produto_id'          => $data['produto_id'],
                    'obra_id'             => $data['obra_id'],
                    'tipo'                => Movimentacao::TIPO_TRANSF_OUT,
                    'quantidade'          => $data['quantidade'],
                    'valor_unitario'      => $data['valor_unitario'] ?? 0,
                    'valor_total'         => $valorTotal,
                    'data_movimento'      => $data['data_movimento'],
                    'observacao'          => $data['observacao'] ?? null,
                    'obra_contraparte_id' => $data['obra_destino_id'],
                    'user_create'         => $userEmail,
                ]);

                $in = Movimentacao::create([
                    'company_id'           => $companyId,
                    'produto_id'           => $data['produto_id'],
                    'obra_id'              => $data['obra_destino_id'],
                    'tipo'                 => Movimentacao::TIPO_TRANSF_IN,
                    'quantidade'           => $data['quantidade'],
                    'valor_unitario'       => $data['valor_unitario'] ?? 0,
                    'valor_total'          => $valorTotal,
                    'data_movimento'       => $data['data_movimento'],
                    'observacao'           => $data['observacao'] ?? null,
                    'obra_contraparte_id'  => $data['obra_id'],
                    'movimentacao_par_id'  => $out->id,
                    'user_create'          => $userEmail,
                ]);

                // Atualiza o par no OUT (referência mútua)
                $out->update(['movimentacao_par_id' => $in->id]);

                return $out;
            });

            return redirect()->route('admin.estoque.movimentacoes.show', $mov)
                ->with('success', 'Transferência registrada (par OUT/IN criado).');
        }

        // ============= ENTRADA / SAÍDA / DEVOLUÇÃO =============
        // Para SAÍDA, valida senha do retirante antes de criar a movimentação.
        // Para entrada/devolução não é exigido (operação do almoxarife).
        //
        // SAÍDA aceita DOIS caminhos de identificação:
        //   - retirante_user_id        + senha do usuário do sistema
        //   - retirante_funcionario_id + senha_retirada do funcionário (Fase 1)
        $auditValidacao = [
            'retirante_user_id'        => null,
            'retirante_funcionario_id' => null,
            'validacao_method'         => null,
            'validado_em'              => null,
        ];

        if ($data['tipo'] === Movimentacao::TIPO_SAIDA) {
            if (!empty($data['retirante_funcionario_id'])) {
                $func = $this->validarSenhaRetiranteFunc(
                    (int) $data['retirante_funcionario_id'],
                    (string) $data['retirante_senha']
                );
                $auditValidacao = [
                    'retirante_user_id'        => null,
                    'retirante_funcionario_id' => $func->id,
                    'validacao_method'         => 'SENHA_FUNC',
                    'validado_em'              => now(),
                ];
                // Atualiza heartbeat da última retirada do funcionário
                $func->forceFill(['data_ultima_retirada' => now()])->save();
            } else {
                $retirante = $this->validarSenhaRetirante(
                    (int) $data['retirante_user_id'],
                    (string) $data['retirante_senha']
                );
                $auditValidacao = [
                    'retirante_user_id'        => $retirante->id,
                    'retirante_funcionario_id' => null,
                    'validacao_method'         => 'SENHA',
                    'validado_em'              => now(),
                ];
            }
        }

        $mov = Movimentacao::create([
            'company_id'        => $companyId,
            'produto_id'        => $data['produto_id'],
            'obra_id'           => $data['obra_id'],
            'tipo'              => $data['tipo'],
            'quantidade'        => $data['quantidade'],
            'valor_unitario'    => $data['valor_unitario'] ?? 0,
            'valor_total'       => $valorTotal,
            'data_movimento'    => $data['data_movimento'],
            'observacao'        => $data['observacao'] ?? null,
            'fornecedor_id'     => $data['fornecedor_id'] ?? null,
            'nota_fiscal'       => $data['nota_fiscal'] ?? null,
            'data_nota_fiscal'  => $data['data_nota_fiscal'] ?? null,
            'user_create'       => $userEmail,
            ...$auditValidacao,
        ]);

        // Em ENTRADA: atualiza valor_ultima_entrada do produto (para referência)
        if (in_array($data['tipo'], Movimentacao::TIPOS_ENTRADA, true) && !empty($data['valor_unitario'])) {
            Produto::where('id', $data['produto_id'])
                ->update(['valor_ultima_entrada' => $data['valor_unitario']]);
        }

        return redirect()->route('admin.estoque.movimentacoes.show', $mov)
            ->with('success', 'Movimentação registrada.');
    }

    public function destroy(Request $request, Movimentacao $movimentacao)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $movimentacao->company_id !== $companyId, 403);

        // Para transferências, deleta o par junto (em transação)
        DB::transaction(function () use ($movimentacao) {
            if ($movimentacao->movimentacao_par_id) {
                $par = Movimentacao::find($movimentacao->movimentacao_par_id);
                $par?->delete();
            }
            $movimentacao->delete();
        });

        return redirect()->route('admin.estoque.movimentacoes.index')
            ->with('success', 'Movimentação excluída. Saldo recalculado automaticamente.');
    }

    // -----------------------------------------------------------------------
    // Endpoints AJAX usados pelo form
    // -----------------------------------------------------------------------

    /**
     * Busca produtos por nome/sku/código de barras (autocomplete).
     */
    public function buscarProdutos(Request $request)
    {
        $q = trim($request->input('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['data' => []]);
        }

        $produtos = Produto::query()
            ->where('ativo', true)
            ->where(function ($w) use ($q) {
                $w->where('nome', 'like', "%{$q}%")
                  ->orWhere('sku', 'like', "%{$q}%")
                  ->orWhere('codigo_barras', 'like', "%{$q}%");
            })
            ->with([
                'variacoes:id,produto_id,tipo,valor,ordem',
                'categoria:id,nome,parent_id',
            ])
            ->limit(20)
            ->get(['id', 'sku', 'nome', 'unidade', 'valor_unitario', 'valor_ultima_entrada', 'imagem',
                   'controla_variacao', 'tipo_item', 'categoria_id']);

        return response()->json(['data' => $produtos]);
    }

    /**
     * Lotes disponíveis (saldo > 0) de um produto/variante numa obra, em
     * ordem FEFO (vence primeiro, primeiro). Usado na SAÍDA de EPI.
     *
     * Se cor/tamanho forem informados, resolve a variante; caso contrário
     * lista todos os lotes do produto na obra.
     */
    public function lotesDisponiveis(Request $request)
    {
        $request->validate([
            'produto_id' => 'required|integer',
            'obra_id'    => 'required|integer',
            'cor'        => 'nullable|string',
            'tamanho'    => 'nullable|string',
        ]);
        $companyId = CompanyContext::current()?->id;

        $varianteId = null;
        $cor     = trim((string) $request->input('cor'))     ?: null;
        $tamanho = trim((string) $request->input('tamanho')) ?: null;

        if ($cor !== null || $tamanho !== null) {
            $variante = \App\Models\Estoque\ProdutoVariante::where('produto_id', $request->input('produto_id'))
                ->where('cor', $cor)->where('tamanho', $tamanho)->first();
            // Variante ainda não existe → não há lote
            if (!$variante) {
                return response()->json(['data' => []]);
            }
            $varianteId = $variante->id;
        }

        $lotes = \App\Models\Estoque\Lote::query()
            ->where('produto_id', $request->input('produto_id'))
            ->where('obra_id', $request->input('obra_id'))
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($varianteId, fn ($q) => $q->where('variante_id', $varianteId))
            ->with('variante:id,cor,tamanho')
            ->comSaldo()
            ->fefo()
            ->get(['id', 'variante_id', 'numero_ca', 'numero_lote', 'validade', 'quantidade_atual', 'valor_unitario']);

        return response()->json([
            'data' => $lotes->map(fn ($l) => [
                'id'               => $l->id,
                'cor'              => $l->variante?->cor,
                'tamanho'          => $l->variante?->tamanho,
                'variante_rotulo'  => collect([$l->variante?->cor, $l->variante?->tamanho])->filter()->implode(' · ') ?: null,
                'numero_ca'        => $l->numero_ca,
                'numero_lote'      => $l->numero_lote,
                'validade'         => $l->validade?->format('Y-m-d'),
                'quantidade_atual' => (float) $l->quantidade_atual,
                'valor_unitario'   => (float) $l->valor_unitario,
                'dias_para_vencer' => $l->dias_para_vencer,
            ]),
        ]);
    }

    /**
     * Retorna o saldo atual do produto numa obra.
     */
    public function saldoProdutoObra(Request $request)
    {
        $request->validate([
            'produto_id' => 'required|integer',
            'obra_id'    => 'required|integer',
        ]);
        $companyId = CompanyContext::current()?->id;

        $saldo = Saldo::where('produto_id', $request->input('produto_id'))
            ->where('obra_id', $request->input('obra_id'))
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->first();

        return response()->json([
            'quantidade'  => $saldo ? (float) $saldo->quantidade : 0,
            'valor_medio' => $saldo ? (float) $saldo->valor_medio : 0,
        ]);
    }

    /**
     * Valida a senha do funcionário retirante. Aplica rate limit para evitar
     * brute-force. Lança ValidationException com erro amigável se falhar.
     *
     * @return User  o usuário retirante (já carregado, ativo)
     */
    private function validarSenhaRetirante(int $userId, string $senha): User
    {
        // Rate limit: 5 tentativas / 5min por (operador, user-alvo)
        $key = 'estoque-retirada:' . request()->user()->id . ':' . $userId;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'retirante_senha' => "Muitas tentativas. Aguarde {$seconds}s e tente novamente.",
            ]);
        }

        $user = User::find($userId);
        if (!$user) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'retirante_user_id' => 'Funcionário não encontrado.',
            ]);
        }

        if (!Hash::check($senha, $user->password)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'retirante_senha' => 'Senha do retirante incorreta.',
            ]);
        }

        // Senha correta: zera contador de tentativas
        RateLimiter::clear($key);
        return $user;
    }

    /**
     * Valida a senha_retirada de um FUNCIONÁRIO (Fase 1: retirante sem login).
     * Mesma estratégia (rate-limit + Hash::check) do validarSenhaRetirante,
     * só que contra a tabela `funcionarios`.
     */
    private function validarSenhaRetiranteFunc(int $funcionarioId, string $senha): Funcionario
    {
        $key = 'estoque-retirada-func:' . request()->user()->id . ':' . $funcionarioId;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'retirante_senha' => "Muitas tentativas. Aguarde {$seconds}s e tente novamente.",
            ]);
        }

        $companyId = CompanyContext::current()?->id;
        $func = Funcionario::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->find($funcionarioId);

        if (!$func) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'retirante_funcionario_id' => 'Funcionário não encontrado.',
            ]);
        }

        if (empty($func->senha_retirada)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'retirante_senha' => 'Funcionário sem senha de retirada cadastrada. Cadastre no perfil do funcionário antes.',
            ]);
        }

        if (!Hash::check($senha, $func->senha_retirada)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'retirante_senha' => 'Senha do retirante incorreta.',
            ]);
        }

        RateLimiter::clear($key);
        return $func;
    }

    /**
     * Busca usuários para o autocomplete de retirante (mínimo 2 caracteres).
     * Retorna apenas dados públicos — NUNCA password ou remember_token.
     */
    public function buscarFuncionarios(Request $request)
    {
        $q = trim($request->input('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['data' => []]);
        }
        $users = User::query()
            ->select('id', 'name', 'email', 'type')
            ->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
            })
            ->orderBy('name')
            ->limit(15)
            ->get();
        return response()->json(['data' => $users]);
    }

    private function tiposLabels(): array
    {
        return [
            'ENTRADA'           => ['label' => 'Entrada',           'cor' => 'emerald'],
            'SAIDA'             => ['label' => 'Saída',             'cor' => 'red'],
            'TRANSF_OUT'        => ['label' => 'Transferência (out)','cor' => 'orange'],
            'TRANSF_IN'         => ['label' => 'Transferência (in)', 'cor' => 'blue'],
            'AJUSTE_INVENTARIO' => ['label' => 'Ajuste inventário', 'cor' => 'amber'],
            'DEVOLUCAO'         => ['label' => 'Devolução',         'cor' => 'purple'],
        ];
    }
}
