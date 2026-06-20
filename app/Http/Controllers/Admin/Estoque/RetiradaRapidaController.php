<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\Saldo;
use App\Models\Obra;
use App\Services\Estoque\RetiranteValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Retirada Rápida — tela dedicada com leitor de código de barras/QR.
 *
 * Fluxo:
 *   1) Operador escolhe a obra de saída e identifica o funcionário retirante.
 *   2) Usa o scanner (html5-qrcode) para ler SKU/código de barras de cada item.
 *   3) Itens são acumulados num "carrinho" client-side.
 *   4) Funcionário digita a senha UMA vez e o sistema cria N saídas em UMA
 *      transação. Falha em qualquer item = rollback total.
 *
 * Performance: a busca por código é otimizada (where sku/codigo_barras exatos)
 * para retornar em <50ms mesmo com 10k+ produtos.
 */
class RetiradaRapidaController extends Controller
{
    public function index()
    {
        $companyId = CompanyContext::current()?->id;

        return Inertia::render('Admin/Estoque/RetiradaRapida/Index', [
            'obras' => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                          ->orderBy('codigo_obra')
                          ->get(['id', 'codigo_obra', 'nome_fantasia']),
        ]);
    }

    /**
     * GET /admin/estoque/retirada-rapida/produto-por-codigo?codigo=XXX&obra_id=N
     *
     * Resolve produto por SKU OU código de barras (match EXATO, não LIKE).
     * Inclui saldo atual na obra para o front decidir se aceita ou rejeita.
     */
    public function produtoPorCodigo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'codigo'  => ['required', 'string', 'max:120'],
            'obra_id' => ['nullable', 'integer'],
        ]);

        $codigo = trim($data['codigo']);

        $produto = Produto::query()
            ->where('ativo', true)
            ->where(function ($w) use ($codigo) {
                $w->where('sku', $codigo)
                  ->orWhere('codigo_barras', $codigo);
            })
            ->first(['id', 'sku', 'codigo_barras', 'nome', 'unidade',
                     'valor_unitario', 'valor_ultima_entrada', 'imagem']);

        if (!$produto) {
            return response()->json([
                'ok'    => false,
                'error' => "Nenhum produto com código \"{$codigo}\".",
            ], 404);
        }

        // Saldo na obra (se informada)
        $saldo = null;
        if (!empty($data['obra_id'])) {
            $companyId = CompanyContext::current()?->id;
            $s = Saldo::where('produto_id', $produto->id)
                ->where('obra_id', $data['obra_id'])
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->first();
            $saldo = [
                'quantidade'  => $s ? (float) $s->quantidade : 0,
                'valor_medio' => $s ? (float) $s->valor_medio : 0,
            ];
        }

        return response()->json([
            'ok'      => true,
            'produto' => $produto,
            'saldo'   => $saldo,
        ]);
    }

    /**
     * POST /admin/estoque/retirada-rapida
     *
     * Cria N movimentações SAIDA em UMA transação, todas validadas com a
     * mesma senha do mesmo funcionário. Saldo é re-checado servidor-side
     * para cada item (concorrência: dois operadores retirando do mesmo
     * produto simultaneamente).
     */
    public function store(Request $request, RetiranteValidator $validator)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de operar.');

        $data = $request->validate([
            'obra_id'                  => ['required', 'integer', Rule::exists('obras', 'id')],
            'retirante_funcionario_id' => ['required', 'integer', Rule::exists('funcionarios', 'id')->whereNull('deleted_at')],
            'retirante_senha'          => ['required', 'string'],
            'observacao'               => ['nullable', 'string', 'max:1000'],
            'itens'                    => ['required', 'array', 'min:1', 'max:100'],
            'itens.*.produto_id'       => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'itens.*.quantidade'       => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'itens.*.valor_unitario'   => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        // 1) Valida a senha do funcionário UMA VEZ (compartilhada para todos os itens)
        $func = $validator->validarFuncionario(
            (int) $data['retirante_funcionario_id'],
            (string) $data['retirante_senha'],
            'retirante_senha'
        );

        // 2) Pré-validação de saldo para TODOS os itens antes de começar a inserir.
        //    Se faltar saldo em qualquer um, devolve a lista completa de problemas
        //    (não para no primeiro — operador corrige tudo de uma vez).
        $erros = [];
        $obraId = (int) $data['obra_id'];
        foreach ($data['itens'] as $idx => $item) {
            $saldo = Saldo::where('produto_id', $item['produto_id'])
                ->where('obra_id', $obraId)
                ->value('quantidade') ?? 0;
            if ((float) $saldo < (float) $item['quantidade']) {
                $erros["itens.{$idx}.quantidade"] = sprintf(
                    'Saldo insuficiente. Disponível: %s (solicitado: %s).',
                    number_format((float) $saldo, 3, ',', '.'),
                    number_format((float) $item['quantidade'], 3, ',', '.')
                );
            }
        }
        if (!empty($erros)) {
            throw ValidationException::withMessages($erros);
        }

        // 3) Cria N movimentações em transação
        $movsCriadas = DB::transaction(function () use ($data, $func, $companyId, $obraId) {
            $userEmail = Auth::user()->email;
            $hoje      = now()->toDateString();
            $ids       = [];

            foreach ($data['itens'] as $item) {
                $valorTotal = (float) $item['quantidade'] * (float) ($item['valor_unitario'] ?? 0);

                $mov = Movimentacao::create([
                    'company_id'              => $companyId,
                    'tipo'                    => Movimentacao::TIPO_SAIDA,
                    'produto_id'              => $item['produto_id'],
                    'obra_id'                 => $obraId,
                    'quantidade'              => $item['quantidade'],
                    'valor_unitario'          => $item['valor_unitario'] ?? 0,
                    'valor_total'             => $valorTotal,
                    'data_movimento'          => $hoje,
                    'observacao'              => trim(
                        '[Retirada rápida] ' . ($data['observacao'] ?? '')
                    ),
                    'retirante_funcionario_id'=> $func->id,
                    'validacao_method'        => 'SENHA_FUNC',
                    'validado_em'             => now(),
                    'user_create'             => $userEmail,
                ]);

                $ids[] = $mov->id;
            }

            return $ids;
        });

        Log::info('Estoque: RETIRADA RAPIDA registrada', [
            'mov_ids'        => $movsCriadas,
            'funcionario_id' => $func->id,
            'qtd_itens'      => count($movsCriadas),
            'obra_id'        => $obraId,
            'operador'       => Auth::user()->email,
        ]);

        // Redireciona para o comprovante em lote
        $idsStr = implode(',', $movsCriadas);
        return redirect()
            ->route('admin.estoque.comprovantes.lote', ['ids' => $idsStr])
            ->with('success', count($movsCriadas) . ' item(s) retirado(s) por ' . $func->nome . '.');
    }
}
