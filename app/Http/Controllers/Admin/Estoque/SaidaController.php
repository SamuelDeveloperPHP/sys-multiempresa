<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Helpers\ObraContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Lote;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\Saldo;
use App\Models\Fornecedor;
use App\Models\Obra;
use App\Services\Estoque\RetiranteValidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Saídas de estoque — tela dedicada para TIPO_SAIDA.
 *
 * Regras (Fase 1):
 *   - Retirante OBRIGATÓRIO: funcionário (sem login, com senha_retirada)
 *     OU usuário do sistema (com senha de login). Exatamente um dos dois.
 *   - Senha do retirante OBRIGATÓRIA. Validação central em
 *     RetiranteValidator com rate-limit (5 tentativas/5min).
 *   - Saldo suficiente VALIDADO antes de criar.
 *   - Auditoria gravada: retirante_*, validacao_method, validado_em.
 *
 * Atualiza `funcionarios.data_ultima_retirada` quando o retirante é
 * funcionário (gerenciado pelo RetiranteValidator).
 */
class SaidaController extends Controller
{
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        $query = Movimentacao::query()
            ->where('tipo', Movimentacao::TIPO_SAIDA)
            ->with([
                'produto:id,sku,nome,unidade',
                'obra:id,codigo_obra,nome_fantasia',
                'retirante:id,name,email',
                'retiranteFuncionario:id,nome,matricula,cpf',
            ]);

        if ($companyId) $query->where('company_id', $companyId);
        if ($obra = $request->input('obra_id')) $query->where('obra_id', $obra);
        if ($q    = $request->input('q')) {
            $query->whereHas('produto', fn ($w) =>
                $w->where('nome', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"));
        }
        if ($de  = $request->input('data_de'))  $query->whereDate('data_movimento', '>=', $de);
        if ($ate = $request->input('data_ate')) $query->whereDate('data_movimento', '<=', $ate);

        $saidas = $query->orderByDesc('id')->simplePaginate(25)->withQueryString();

        return Inertia::render('Admin/Estoque/Saidas/Index', [
            'saidas'  => $saidas,
            'obras'   => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                            ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'filtros' => $request->only(['obra_id', 'q', 'data_de', 'data_ate']),
        ]);
    }

    public function create(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $isSuper   = $request->user()->type === 'super_admin';
        $obraAtual = ObraContext::current();

        $obras = $isSuper
            ? Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia'])
            : ObraContext::userObras()->map(fn ($o) => $o->only(['id', 'codigo_obra', 'nome_fantasia']))->values();

        return Inertia::render('Admin/Estoque/Saidas/Form', [
            'obras'      => $obras,
            'obra_atual' => $obraAtual?->only(['id', 'codigo_obra', 'nome_fantasia']),
            'is_super'   => $isSuper,
        ]);
    }

    /** Detalhes de uma saída (movimentação SAIDA). */
    public function show(Movimentacao $movimentacao)
    {
        $this->garanteSaida($movimentacao);
        $movimentacao->load([
            'produto:id,sku,nome,unidade,imagem,tipo_item',
            'obra:id,codigo_obra,nome_fantasia',
            'variante:id,cor,tamanho',
            'lote:id,numero_ca,numero_lote,validade,quantidade_atual,quantidade_inicial',
            'retiranteFuncionario:id,nome,matricula,cpf',
            'retirante:id,name,email',
        ]);

        return Inertia::render('Admin/Estoque/Saidas/Show', ['saida' => $movimentacao]);
    }

    /** Formulário de edição de uma saída. */
    public function edit(Movimentacao $movimentacao)
    {
        $this->garanteSaida($movimentacao);
        $movimentacao->load([
            'produto:id,sku,nome,unidade,imagem,tipo_item',
            'obra:id,codigo_obra,nome_fantasia',
            'variante:id,cor,tamanho',
            'lote:id,numero_ca,numero_lote,validade,quantidade_atual,quantidade_inicial,fornecedor_id,data_entrada,movimentacao_entrada_id',
            'lote.movimentacaoEntrada:id,nota_fiscal,data_nota_fiscal',
            'retiranteFuncionario:id,nome,matricula,cpf',
            'retirante:id,name,email',
        ]);

        $companyId = CompanyContext::current()?->id;

        return Inertia::render('Admin/Estoque/Saidas/Edit', [
            'saida'        => $movimentacao,
            'fornecedores' => Fornecedor::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    /**
     * Atualiza uma saída — corrige quantidade/valor/data/observação. O saldo é
     * reajustado pelo Observer; para EPI o lote é sincronizado (com guarda de
     * saldo). Produto, obra, variante, lote e retirante NÃO mudam aqui.
     */
    public function update(Request $request, Movimentacao $movimentacao)
    {
        $this->garanteSaida($movimentacao);

        $data = $request->validate([
            'quantidade'     => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'valor_unitario' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'data_movimento' => ['required', 'date', 'before_or_equal:today'],
            'observacao'     => ['nullable', 'string', 'max:1000'],
            // Dados do lote do EPI (editáveis aqui — corrigem o lote de origem)
            'numero_lote'      => ['nullable', 'string', 'max:60'],
            'numero_ca'        => ['nullable', 'string', 'max:30'],
            'validade'         => ['nullable', 'date'],
            'fornecedor_id'    => ['nullable', 'integer', Rule::exists('fornecedores', 'id')],
            'data_entrada'     => ['nullable', 'date'],
            'nota_fiscal'      => ['nullable', 'string', 'max:50'],
            'data_nota_fiscal' => ['nullable', 'date'],
        ]);

        $novaQtd = (float) $data['quantidade'];
        $oldQtd  = (float) $movimentacao->quantidade;
        $delta   = $novaQtd - $oldQtd; // >0 = consumir mais
        $lote    = $movimentacao->lote;

        // ---- Guardas de saldo ----
        if ($lote) {
            if ((float) $lote->quantidade_atual - $delta < 0) {
                throw ValidationException::withMessages([
                    'quantidade' => sprintf('Lote sem saldo para aumentar a saída. Disponível para acréscimo: %s.',
                        number_format((float) $lote->quantidade_atual, 3, ',', '.')),
                ]);
            }
        } elseif ($delta > 0) {
            $saldo = Saldo::where('produto_id', $movimentacao->produto_id)
                ->where('obra_id', $movimentacao->obra_id)
                ->whereNull('variante_id')
                ->value('quantidade') ?? 0;
            if ((float) $saldo < $delta) {
                throw ValidationException::withMessages([
                    'quantidade' => sprintf('Saldo insuficiente para aumentar a saída. Disponível: %s.',
                        number_format((float) $saldo, 3, ',', '.')),
                ]);
            }
        }

        $valorUnit  = $data['valor_unitario'] ?? ($lote?->valor_unitario ?? $movimentacao->valor_unitario ?? 0);
        $valorTotal = $novaQtd * (float) $valorUnit;

        DB::transaction(function () use ($movimentacao, $data, $valorUnit, $valorTotal, $lote, $delta) {
            $movimentacao->update([
                'quantidade'     => $data['quantidade'],
                'valor_unitario' => $valorUnit,
                'valor_total'    => $valorTotal,
                'data_movimento' => $data['data_movimento'],
                'observacao'     => $data['observacao'] ?? null,
                'user_edit'      => Auth::user()->email,
            ]); // Observer reajusta o saldo

            if ($lote) {
                // Ajusta saldo do lote (delta negativo devolve) e os dados do lote.
                $lote->decrement('quantidade_atual', $delta);
                $lote->update([
                    'numero_lote'    => $data['numero_lote']   ?? null,
                    'numero_ca'      => $data['numero_ca']     ?? null,
                    'validade'       => $data['validade']      ?? null,
                    'fornecedor_id'  => $data['fornecedor_id'] ?? null,
                    'data_entrada'   => $data['data_entrada']  ?? null,
                    'valor_unitario' => $valorUnit,
                ]);

                // NF/data NF ficam na ENTRADA que originou o lote.
                if ($lote->movimentacao_entrada_id) {
                    Movimentacao::where('id', $lote->movimentacao_entrada_id)->update([
                        'nota_fiscal'      => $data['nota_fiscal'] ?? null,
                        'data_nota_fiscal' => $data['data_nota_fiscal'] ?? null,
                        'fornecedor_id'    => $data['fornecedor_id'] ?? null,
                    ]);
                }
            }
        });

        return redirect()->route('admin.estoque.saidas.show', $movimentacao)
            ->with('success', 'Saída atualizada. Saldo recalculado.');
    }

    /** Garante que a movimentação é uma SAIDA da empresa atual. */
    private function garanteSaida(Movimentacao $mov): void
    {
        abort_unless($mov->tipo === Movimentacao::TIPO_SAIDA, 404, 'Movimentação não é uma saída.');
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $mov->company_id && (int) $mov->company_id !== (int) $companyId, 403);
    }

    /**
     * Saída multi-item: 1 cabeçalho (obra, data, retirante + senha) + N itens
     * (material e/ou EPI com lote FEFO). O retirante valida UMA vez e todos os
     * itens saem numa única transação.
     */
    public function store(Request $request, RetiranteValidator $validator)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de lançar saída.');

        $data = $request->validate([
            'obra_id'         => ['required', 'integer', Rule::exists('obras', 'id')],
            'data_movimento'  => ['required', 'date', 'before_or_equal:today'],
            'observacao'      => ['nullable', 'string', 'max:1000'],

            'modo_retirante'           => ['required', Rule::in(['funcionario', 'usuario'])],
            'retirante_funcionario_id' => ['nullable', 'integer', Rule::exists('funcionarios', 'id')->whereNull('deleted_at')],
            'retirante_user_id'        => ['nullable', 'integer', Rule::exists('users', 'id')],
            'retirante_senha'          => ['required', 'string'],

            'itens'                  => ['required', 'array', 'min:1'],
            'itens.*.produto_id'     => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'itens.*.quantidade'     => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'itens.*.valor_unitario' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'itens.*.lote_id'        => ['nullable', 'integer', Rule::exists('estoque_lotes', 'id')->whereNull('deleted_at')],
            'itens.*.observacao'     => ['nullable', 'string', 'max:1000'],
        ]);

        abort_unless(ObraContext::userCanAccess((int) $data['obra_id']), 403,
            'Você não tem acesso a esta obra.');

        // Valida o retirante UMA vez (rate-limited) → auditoria comum a todos os itens.
        $audit = $this->validarRetirante($data, $validator);

        $header = [
            'company_id'     => $companyId,
            'obra_id'        => $data['obra_id'],
            'data_movimento' => $data['data_movimento'],
            'observacao'     => $data['observacao'] ?? null,
        ];

        $movs = DB::transaction(function () use ($data, $header, $audit) {
            $criadas = [];
            foreach ($data['itens'] as $i => $item) {
                $criadas[] = $this->lancarSaida($item, $header, $audit, $i);
            }
            return $criadas;
        });

        Log::info('Estoque: SAIDA multi-item registrada', [
            'qtd_itens' => count($movs),
            'metodo'    => $audit['validacao_method'],
            'usuario'   => Auth::user()->email,
        ]);

        return redirect()->route('admin.estoque.saidas.index')
            ->with('success', sprintf(
                'Saída registrada: %d %s. Saldos atualizados.',
                count($movs),
                count($movs) === 1 ? 'item' : 'itens',
            ))
            ->with('comprovante_lote_ids', collect($movs)->pluck('id')->implode(','));
    }

    /**
     * Valida o retirante (funcionário OU usuário) e devolve os campos de
     * auditoria a gravar em cada movimentação.
     */
    private function validarRetirante(array $data, RetiranteValidator $validator): array
    {
        if ($data['modo_retirante'] === 'funcionario') {
            if (empty($data['retirante_funcionario_id'])) {
                throw ValidationException::withMessages([
                    'retirante_funcionario_id' => 'Selecione o funcionário retirante.',
                ]);
            }
            $func = $validator->validarFuncionario(
                (int) $data['retirante_funcionario_id'],
                (string) $data['retirante_senha'],
                'retirante_senha'
            );
            return [
                'retirante_user_id'        => null,
                'retirante_funcionario_id' => $func->id,
                'validacao_method'         => 'SENHA_FUNC',
                'validado_em'              => now(),
            ];
        }

        if (empty($data['retirante_user_id'])) {
            throw ValidationException::withMessages([
                'retirante_user_id' => 'Selecione o usuário retirante.',
            ]);
        }
        $user = $validator->validarUsuario(
            (int) $data['retirante_user_id'],
            (string) $data['retirante_senha'],
            'retirante_senha'
        );
        return [
            'retirante_user_id'        => $user->id,
            'retirante_funcionario_id' => null,
            'validacao_method'         => 'SENHA',
            'validado_em'              => now(),
        ];
    }

    /**
     * Lança a saída de um item: valida saldo (lote p/ EPI, saldo p/ material),
     * cria a movimentação SAIDA e decrementa o lote. Dentro de transação.
     */
    private function lancarSaida(array $item, array $header, array $audit, int $idx): Movimentacao
    {
        $produto    = Produto::findOrFail($item['produto_id']);
        $rotuloItem = '#' . ($idx + 1) . ' (' . $produto->nome . ')';

        $lote = null;
        $varianteId = null;

        if ($produto->isEpiOuAfins()) {
            if (empty($item['lote_id'])) {
                throw ValidationException::withMessages([
                    'itens' => "Item {$rotuloItem}: selecione o lote de onde o item será retirado.",
                ]);
            }
            $lote = Lote::where('id', $item['lote_id'])
                ->where('produto_id', $item['produto_id'])
                ->where('obra_id', $header['obra_id'])
                ->first();
            if (!$lote) {
                throw ValidationException::withMessages([
                    'itens' => "Item {$rotuloItem}: lote inválido para este produto/obra.",
                ]);
            }
            $varianteId = $lote->variante_id;

            if ((float) $lote->quantidade_atual < (float) $item['quantidade']) {
                throw ValidationException::withMessages([
                    'itens' => sprintf('Item %s: saldo do lote insuficiente. Disponível: %s (solicitado: %s).',
                        $rotuloItem,
                        number_format((float) $lote->quantidade_atual, 3, ',', '.'),
                        number_format((float) $item['quantidade'], 3, ',', '.')),
                ]);
            }
        } else {
            $saldo = Saldo::where('produto_id', $item['produto_id'])
                ->where('obra_id', $header['obra_id'])
                ->whereNull('variante_id')
                ->value('quantidade') ?? 0;
            if ((float) $saldo < (float) $item['quantidade']) {
                throw ValidationException::withMessages([
                    'itens' => sprintf('Item %s: saldo insuficiente. Disponível: %s (solicitado: %s).',
                        $rotuloItem,
                        number_format((float) $saldo, 3, ',', '.'),
                        number_format((float) $item['quantidade'], 3, ',', '.')),
                ]);
            }
        }

        $valorUnit  = $item['valor_unitario'] ?? ($lote?->valor_unitario ?? 0);
        $valorTotal = (float) $item['quantidade'] * (float) $valorUnit;

        $mov = Movimentacao::create(array_merge([
            'company_id'      => $header['company_id'],
            'tipo'            => Movimentacao::TIPO_SAIDA,
            'produto_id'      => $item['produto_id'],
            'variante_id'     => $varianteId,
            'lote_id'         => $lote?->id,
            'obra_id'         => $header['obra_id'],
            'quantidade'      => $item['quantidade'],
            'valor_unitario'  => $valorUnit,
            'valor_total'     => $valorTotal,
            'data_movimento'  => $header['data_movimento'],
            'observacao'      => $item['observacao'] ?? $header['observacao'],
            'user_create'     => Auth::user()->email,
        ], $audit));

        if ($lote) {
            $lote->decrement('quantidade_atual', (float) $item['quantidade']);
        }

        return $mov;
    }
}
