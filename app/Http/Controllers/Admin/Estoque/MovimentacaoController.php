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
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            ->with(['produto:id,sku,nome,unidade', 'obra:id,codigo_obra,nome', 'obraContraparte:id,codigo_obra,nome', 'fornecedor:id,razao_social']);

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

        $movimentacoes = $query->orderByDesc('data_movimento')->orderByDesc('id')
            ->paginate(25)->withQueryString();

        return Inertia::render('Admin/Estoque/Movimentacoes/Index', [
            'movimentacoes' => $movimentacoes,
            'obras'         => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome']),
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
                                ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome']),
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
            'obra:id,codigo_obra,nome',
            'obraContraparte:id,codigo_obra,nome',
            'fornecedor:id,razao_social,nome_fantasia',
            'par',
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
            ->limit(20)
            ->get(['id', 'sku', 'nome', 'unidade', 'valor_unitario', 'valor_ultima_entrada', 'imagem']);

        return response()->json(['data' => $produtos]);
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
