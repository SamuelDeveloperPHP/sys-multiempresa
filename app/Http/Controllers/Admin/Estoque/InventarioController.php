<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\InventarioRequest;
use App\Models\Estoque\Inventario;
use App\Models\Estoque\InventarioItem;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\Saldo;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Inventário (contagem física) por obra.
 *
 * Fluxo:
 *   ABERTO  : snapshot do saldo atual feito ao criar. Almoxarife preenche
 *             saldo_contado item por item. Cada save atualiza diferença.
 *   FECHADO : ao fechar, para cada item com diferença ≠ 0:
 *               - se diferença > 0 (sobrou no físico): cria mov ENTRADA
 *               - se diferença < 0 (faltou no físico): cria mov SAIDA
 *             ambas vinculadas ao inventario_id com observação padrão.
 *             Tudo em DB::transaction. Status passa a FECHADO.
 *   CANCELADO : sem gerar movs. Apenas marca status.
 *
 * Movimentações de ajuste usam ENTRADA/SAIDA (não AJUSTE_INVENTARIO no enum)
 * para reutilizar o Observer existente que atualiza saldos com sinal correto.
 */
class InventarioController extends Controller
{
    // =======================================================================
    // LISTAGEM / DASHBOARD
    // =======================================================================

    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        $query = Inventario::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->with(['obra:id,codigo_obra,nome_fantasia', 'responsavel:id,name'])
            ->withCount(['itens', 'itens as itens_contados_count' => fn ($q) => $q->where('contado', true)]);

        if ($status = $request->input('status'))      $query->where('status', $status);
        if ($obraId  = $request->input('obra_id'))    $query->where('obra_id', $obraId);
        if ($q       = $request->input('q')) {
            $query->where(fn ($w) => $w->where('numero', 'like', "%{$q}%")
                                       ->orWhere('observacao', 'like', "%{$q}%"));
        }

        $inventarios = $query->orderByDesc('id')->simplePaginate(20)->withQueryString();

        // Contadores para os badges no topo
        $contadores = Inventario::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')->pluck('total', 'status')->all();

        // Alertas de estoque baixo (dashboard)
        $alertasMinimo = $this->alertasEstoqueMinimo($companyId, 10);

        return Inertia::render('Admin/Estoque/Inventarios/Index', [
            'inventarios'   => $inventarios,
            'obras'         => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'contadores'    => $contadores,
            'alertasMinimo' => $alertasMinimo,
            'filtros'       => $request->only(['status', 'obra_id', 'q']),
        ]);
    }

    public function show(Inventario $inventario)
    {
        $this->authorizeCompany($inventario);

        $inventario->load([
            'obra:id,codigo_obra,nome_fantasia',
            'responsavel:id,name',
        ]);

        $itens = $inventario->itens()
            ->with('produto:id,sku,nome,unidade,imagem,estoque_minimo')
            ->orderByRaw('contado ASC')  // não contados primeiro
            ->orderBy('produto_id')
            ->paginate(50)->withQueryString();

        // Resumo
        $resumo = [
            'total_itens'        => $inventario->itens()->count(),
            'contados'           => $inventario->itens()->where('contado', true)->count(),
            'divergentes'        => $inventario->itens()->where('contado', true)->where('diferenca', '!=', 0)->count(),
            'valor_diferenca'    => (float) $inventario->itens()->where('contado', true)->sum('valor_diferenca'),
        ];

        return Inertia::render('Admin/Estoque/Inventarios/Show', [
            'inventario' => $inventario,
            'itens'      => $itens,
            'resumo'     => $resumo,
        ]);
    }

    // =======================================================================
    // ABRIR INVENTÁRIO
    // =======================================================================

    public function create()
    {
        $companyId = CompanyContext::current()?->id;
        return Inertia::render('Admin/Estoque/Inventarios/Form', [
            'obras'      => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                              ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
        ]);
    }

    public function store(InventarioRequest $request)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de abrir inventário.');

        $userId = $request->user()->id;
        $obraId = (int) $request->input('obra_id');

        // Bloqueia se já existe inventário ABERTO para a mesma obra
        $existe = Inventario::where('company_id', $companyId)
            ->where('obra_id', $obraId)
            ->where('status', Inventario::STATUS_ABERTO)
            ->first();
        if ($existe) {
            return back()->withErrors([
                'obra_id' => "Já existe inventário aberto (#{$existe->numero}) para esta obra. Feche ou cancele antes de abrir outro.",
            ]);
        }

        $inventario = DB::transaction(function () use ($request, $companyId, $userId, $obraId) {
            $inv = Inventario::create([
                'company_id'      => $companyId,
                'numero'          => Inventario::gerarNumero($companyId),
                'obra_id'         => $obraId,
                'responsavel_id'  => $userId,
                'status'          => Inventario::STATUS_ABERTO,
                'data_inicio'     => $request->input('data_inicio'),
                'observacao'      => $request->input('observacao'),
            ]);

            // Snapshot: pega o saldo atual de TODOS os produtos da obra
            // e cria 1 InventarioItem por linha. Se filtrar por categoria,
            // ainda usa LEFT JOIN para incluir produtos sem saldo (vai zerados).
            $categoriaId    = $request->input('categoria_id');
            $apenasComSaldo = $request->boolean('apenas_com_saldo', true);

            $produtosQuery = Produto::query()
                ->where('ativo', true)
                ->when($categoriaId, fn ($q) => $q->where('categoria_id', $categoriaId));

            if ($apenasComSaldo) {
                // Só produtos que TÊM saldo na obra (>0). Mais rápido.
                $produtosQuery->whereHas('saldos', fn ($q) =>
                    $q->where('obra_id', $obraId)->where('quantidade', '>', 0)
                );
            }

            // Mapa saldo por produto (1 query)
            $saldos = Saldo::where('obra_id', $obraId)
                ->pluck('quantidade', 'produto_id')
                ->map(fn ($q) => (float) $q);

            // Insere em chunks de 500 para evitar memória + N+1
            $produtosQuery->orderBy('id')->chunk(500, function ($produtos) use ($inv, $saldos) {
                $linhas = [];
                $now    = now();
                foreach ($produtos as $p) {
                    $sistema = (float) ($saldos[$p->id] ?? 0);
                    $linhas[] = [
                        'inventario_id'   => $inv->id,
                        'produto_id'      => $p->id,
                        'saldo_sistema'   => $sistema,
                        'saldo_contado'   => null,
                        'diferenca'       => 0,
                        'valor_unitario'  => $p->valor_unitario ?? 0,
                        'valor_diferenca' => 0,
                        'contado'         => false,
                        'created_at'      => $now,
                        'updated_at'      => $now,
                    ];
                }
                if (!empty($linhas)) {
                    InventarioItem::insert($linhas);
                }
            });

            return $inv;
        });

        return redirect()->route('admin.estoque.inventarios.show', $inventario)
            ->with('success', "Inventário {$inventario->numero} aberto com snapshot do saldo atual.");
    }

    // =======================================================================
    // CONTAGEM (atualiza saldo_contado de um item)
    // =======================================================================

    public function atualizarItem(Request $request, Inventario $inventario, InventarioItem $item)
    {
        $this->authorizeCompany($inventario);
        $this->mustBeStatus($inventario, Inventario::STATUS_ABERTO);
        abort_if($item->inventario_id !== $inventario->id, 404);

        $data = $request->validate([
            'saldo_contado' => ['required', 'numeric', 'min:0', 'max:999999999.999'],
            'observacao'    => ['nullable', 'string', 'max:500'],
        ]);

        $contado   = (float) $data['saldo_contado'];
        $sistema   = (float) $item->saldo_sistema;
        $diferenca = $contado - $sistema;
        $valorDiff = $diferenca * (float) $item->valor_unitario;

        $item->update([
            'saldo_contado'   => $contado,
            'diferenca'       => $diferenca,
            'valor_diferenca' => $valorDiff,
            'observacao'      => $data['observacao'] ?? $item->observacao,
            'contado'         => true,
        ]);

        // Recalcula agregados do inventário
        $inventario->update([
            'qtd_itens_divergentes' => $inventario->itens()
                ->where('contado', true)->where('diferenca', '!=', 0)->count(),
            'valor_diferenca_total' => (float) $inventario->itens()
                ->where('contado', true)->sum('valor_diferenca'),
        ]);

        return back()->with('success', "Item contado. Diferença: " . number_format($diferenca, 3, ',', '.'));
    }

    /**
     * Atualiza vários itens em lote (utilizado pela tela de contagem).
     */
    public function atualizarLote(Request $request, Inventario $inventario)
    {
        $this->authorizeCompany($inventario);
        $this->mustBeStatus($inventario, Inventario::STATUS_ABERTO);

        $data = $request->validate([
            'itens'                  => ['required', 'array', 'min:1'],
            'itens.*.id'             => ['required', 'integer', Rule::exists('estoque_inventario_itens', 'id')->where('inventario_id', $inventario->id)],
            'itens.*.saldo_contado'  => ['required', 'numeric', 'min:0', 'max:999999999.999'],
            'itens.*.observacao'     => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($data, $inventario) {
            foreach ($data['itens'] as $row) {
                $item = InventarioItem::find($row['id']);
                if (!$item) continue;
                $contado   = (float) $row['saldo_contado'];
                $sistema   = (float) $item->saldo_sistema;
                $diferenca = $contado - $sistema;
                $valorDiff = $diferenca * (float) $item->valor_unitario;
                $item->update([
                    'saldo_contado'   => $contado,
                    'diferenca'       => $diferenca,
                    'valor_diferenca' => $valorDiff,
                    'observacao'      => $row['observacao'] ?? $item->observacao,
                    'contado'         => true,
                ]);
            }

            // Recalcula agregados
            $inventario->update([
                'qtd_itens_divergentes' => $inventario->itens()
                    ->where('contado', true)->where('diferenca', '!=', 0)->count(),
                'valor_diferenca_total' => (float) $inventario->itens()
                    ->where('contado', true)->sum('valor_diferenca'),
            ]);
        });

        return back()->with('success', count($data['itens']) . ' itens contados.');
    }

    // =======================================================================
    // FECHAR / CANCELAR
    // =======================================================================

    /**
     * Fecha o inventário gerando movimentações de ajuste automaticamente.
     *
     * Para cada item contado com diferença != 0:
     *   - diferenca > 0 (sobrou no físico) → mov tipo ENTRADA
     *   - diferenca < 0 (faltou no físico) → mov tipo SAIDA
     *
     * O Observer atualiza os saldos. Tudo em transação.
     */
    public function fechar(Request $request, Inventario $inventario)
    {
        $this->authorizeCompany($inventario);
        $this->mustBeStatus($inventario, Inventario::STATUS_ABERTO);

        $request->validate([
            'forcar_nao_contados' => ['nullable', 'boolean'],
        ]);
        $forcar = $request->boolean('forcar_nao_contados');

        $totalItens  = $inventario->itens()->count();
        $naoContados = $inventario->itens()->where('contado', false)->count();

        if ($naoContados > 0 && !$forcar) {
            return back()->withErrors([
                'fechar' => "{$naoContados} de {$totalItens} itens ainda não foram contados. " .
                    "Marque 'Considerar não-contados como saldo zero' para forçar o fechamento.",
            ]);
        }

        $userEmail  = $request->user()->email;
        $userObs    = "Ajuste de inventário {$inventario->numero}";

        DB::transaction(function () use ($inventario, $forcar, $userEmail, $userObs) {
            // Se forçar: trata não-contados como saldo_contado=0
            if ($forcar) {
                $inventario->itens()->where('contado', false)->get()->each(function ($item) {
                    $contado   = 0.0;
                    $sistema   = (float) $item->saldo_sistema;
                    $diferenca = $contado - $sistema;
                    $valorDiff = $diferenca * (float) $item->valor_unitario;
                    $item->update([
                        'saldo_contado'   => $contado,
                        'diferenca'       => $diferenca,
                        'valor_diferenca' => $valorDiff,
                        'contado'         => true,
                    ]);
                });
            }

            // Gera movs de ajuste para itens com diferença != 0
            $itensComDiff = $inventario->itens()
                ->where('contado', true)
                ->where('diferenca', '!=', 0)
                ->get();

            foreach ($itensComDiff as $item) {
                $diferenca = (float) $item->diferenca;
                $tipo      = $diferenca > 0 ? Movimentacao::TIPO_ENTRADA : Movimentacao::TIPO_SAIDA;
                $qtdAbs    = abs($diferenca);

                Movimentacao::create([
                    'company_id'      => $inventario->company_id,
                    'produto_id'      => $item->produto_id,
                    'obra_id'         => $inventario->obra_id,
                    'tipo'            => $tipo,
                    'quantidade'      => $qtdAbs,
                    'valor_unitario'  => $item->valor_unitario,
                    'valor_total'     => $qtdAbs * (float) $item->valor_unitario,
                    'data_movimento'  => now()->toDateString(),
                    'observacao'      => $userObs,
                    'inventario_id'   => $inventario->id,
                    'user_create'     => $userEmail,
                ]);
            }

            $inventario->update([
                'status'                => Inventario::STATUS_FECHADO,
                'data_fechamento'       => now(),
                'qtd_itens_divergentes' => $itensComDiff->count(),
                'valor_diferenca_total' => $itensComDiff->sum('valor_diferenca'),
            ]);
        });

        return redirect()->route('admin.estoque.inventarios.show', $inventario)
            ->with('success', "Inventário {$inventario->numero} fechado. Saldos ajustados.");
    }

    public function cancelar(Request $request, Inventario $inventario)
    {
        $this->authorizeCompany($inventario);
        $this->mustBeStatus($inventario, Inventario::STATUS_ABERTO);

        $inventario->update([
            'status'          => Inventario::STATUS_CANCELADO,
            'data_fechamento' => now(),
        ]);

        return back()->with('success', "Inventário {$inventario->numero} cancelado. Nenhum saldo foi alterado.");
    }

    // =======================================================================
    // HELPERS
    // =======================================================================

    protected function authorizeCompany(Inventario $inv): void
    {
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $inv->company_id !== $companyId, 403);
    }

    protected function mustBeStatus(Inventario $inv, string $status): void
    {
        abort_if($inv->status !== $status, 422,
            "Operação inválida para inventário no status {$inv->status}.");
    }

    /**
     * Retorna até $limit produtos com saldo abaixo do mínimo configurado,
     * dentro da empresa atual. Usado pelo dashboard de alertas.
     */
    protected function alertasEstoqueMinimo(?int $companyId, int $limit): array
    {
        $query = Saldo::query()
            ->select('estoque_saldos.*', 'estoque_produtos.nome as produto_nome',
                     'estoque_produtos.sku as produto_sku',
                     'estoque_produtos.estoque_minimo as minimo',
                     'estoque_produtos.unidade as unidade')
            ->join('estoque_produtos', 'estoque_produtos.id', '=', 'estoque_saldos.produto_id')
            ->whereColumn('estoque_saldos.quantidade', '<', 'estoque_produtos.estoque_minimo')
            ->where('estoque_produtos.estoque_minimo', '>', 0)
            ->where('estoque_produtos.ativo', true);

        if ($companyId) {
            $query->where('estoque_saldos.company_id', $companyId);
        }

        return $query->with('obra:id,codigo_obra,nome_fantasia')
            ->orderByRaw('(estoque_produtos.estoque_minimo - estoque_saldos.quantidade) DESC')
            ->limit($limit)
            ->get()
            ->toArray();
    }
}
