<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Categoria;
use App\Models\Estoque\Movimentacao;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Relatórios gerenciais do módulo Estoque.
 *
 * Endpoints:
 *   hub                : portal /admin/estoque/relatorios
 *   consumoPorObra     : SAÍDAS agregadas por (obra, produto) no período
 *   topProdutos        : produtos com maior movimentação no período
 *   valorEstoque       : valor de estoque atual (snapshot) por obra/categoria
 *   giroEstoque        : índice de giro (saídas ÷ saldo médio) por produto
 *
 * Todos respeitam CompanyContext::current() para isolamento entre empresas
 * e suportam parâmetros de filtro via query string. Saída JSON quando
 * formato=json (para export client-side / dashboard).
 */
class RelatorioController extends Controller
{
    public function hub()
    {
        return Inertia::render('Admin/Estoque/Relatorios/Index');
    }

    // =======================================================================
    // 1) CONSUMO POR OBRA
    // =======================================================================

    public function consumoPorObra(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $filtros   = $this->validarFiltrosPeriodo($request);

        $query = Movimentacao::query()
            ->select(
                'obra_id',
                'produto_id',
                DB::raw('SUM(quantidade) as total_qtd'),
                DB::raw('SUM(valor_total) as total_valor'),
                DB::raw('COUNT(*) as total_movs')
            )
            ->whereIn('tipo', [Movimentacao::TIPO_SAIDA, Movimentacao::TIPO_TRANSF_OUT])
            ->whereBetween('data_movimento', [$filtros['data_de'], $filtros['data_ate']])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($filtros['obra_id'], fn ($q, $id) => $q->where('obra_id', $id))
            ->groupBy('obra_id', 'produto_id')
            ->orderByDesc('total_valor');

        $linhas = $query->limit(500)->get();

        // Carrega nomes em batch (evita N+1)
        $obras    = Obra::whereIn('id', $linhas->pluck('obra_id')->unique())
                        ->get(['id', 'codigo_obra', 'nome_fantasia'])->keyBy('id');
        $produtos = \App\Models\Estoque\Produto::whereIn('id', $linhas->pluck('produto_id')->unique())
                        ->get(['id', 'sku', 'nome', 'unidade'])->keyBy('id');

        $linhas = $linhas->map(fn ($l) => [
            'obra_id'      => $l->obra_id,
            'obra'         => $obras->get($l->obra_id)?->only(['id', 'codigo_obra', 'nome_fantasia']),
            'produto_id'   => $l->produto_id,
            'produto'      => $produtos->get($l->produto_id)?->only(['id', 'sku', 'nome', 'unidade']),
            'total_qtd'    => (float) $l->total_qtd,
            'total_valor'  => (float) $l->total_valor,
            'total_movs'   => (int) $l->total_movs,
        ]);

        $totais = [
            'qtd_total'    => $linhas->sum('total_qtd'),
            'valor_total'  => $linhas->sum('total_valor'),
            'movs_total'   => $linhas->sum('total_movs'),
            'obras_count'  => $linhas->pluck('obra_id')->unique()->count(),
            'produtos_count' => $linhas->pluck('produto_id')->unique()->count(),
        ];

        return Inertia::render('Admin/Estoque/Relatorios/ConsumoPorObra', [
            'linhas'  => $linhas,
            'totais'  => $totais,
            'obras'   => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                            ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'filtros' => $filtros,
        ]);
    }

    // =======================================================================
    // 2) TOP PRODUTOS
    // =======================================================================

    public function topProdutos(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $filtros   = $this->validarFiltrosPeriodo($request, ['tipo']);
        $tipo      = $filtros['tipo'] ?? 'SAIDA';

        $tiposFiltro = match ($tipo) {
            'ENTRADA' => Movimentacao::TIPOS_ENTRADA,
            'AMBOS'   => array_merge(Movimentacao::TIPOS_ENTRADA, Movimentacao::TIPOS_SAIDA),
            default   => Movimentacao::TIPOS_SAIDA,
        };

        $query = Movimentacao::query()
            ->select(
                'produto_id',
                DB::raw('SUM(quantidade) as total_qtd'),
                DB::raw('SUM(valor_total) as total_valor'),
                DB::raw('COUNT(*) as total_movs')
            )
            ->whereIn('tipo', $tiposFiltro)
            ->whereBetween('data_movimento', [$filtros['data_de'], $filtros['data_ate']])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($filtros['obra_id'], fn ($q, $id) => $q->where('obra_id', $id))
            ->groupBy('produto_id')
            ->orderByDesc('total_valor')
            ->limit(50);

        $linhas = $query->get();

        $produtos = \App\Models\Estoque\Produto::whereIn('id', $linhas->pluck('produto_id'))
            ->with('categoria:id,nome')
            ->get(['id', 'sku', 'nome', 'unidade', 'marca', 'categoria_id', 'imagem'])
            ->keyBy('id');

        $maxValor = $linhas->max('total_valor') ?: 1;

        $linhas = $linhas->map(function ($l) use ($produtos, $maxValor) {
            $p = $produtos->get($l->produto_id);
            return [
                'produto_id'  => $l->produto_id,
                'produto'     => $p ? [
                    'id' => $p->id, 'sku' => $p->sku, 'nome' => $p->nome,
                    'unidade' => $p->unidade, 'marca' => $p->marca,
                    'imagem' => $p->imagem,
                    'categoria' => $p->categoria?->only(['id', 'nome']),
                ] : null,
                'total_qtd'   => (float) $l->total_qtd,
                'total_valor' => (float) $l->total_valor,
                'total_movs'  => (int) $l->total_movs,
                'percentual'  => $maxValor > 0 ? round(((float) $l->total_valor / $maxValor) * 100, 1) : 0,
            ];
        });

        return Inertia::render('Admin/Estoque/Relatorios/TopProdutos', [
            'linhas'  => $linhas,
            'tipo'    => $tipo,
            'totais'  => [
                'qtd_total'   => $linhas->sum('total_qtd'),
                'valor_total' => $linhas->sum('total_valor'),
                'movs_total'  => $linhas->sum('total_movs'),
            ],
            'obras'   => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                            ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'filtros' => $filtros,
        ]);
    }

    // =======================================================================
    // 3) VALOR DE ESTOQUE (snapshot)
    // =======================================================================

    public function valorEstoque(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $obraId    = $request->input('obra_id') ?: null;
        $categoriaId = $request->input('categoria_id') ?: null;
        $agruparPor = in_array($request->input('agrupar_por'), ['obra', 'categoria'], true)
            ? $request->input('agrupar_por')
            : 'obra';

        // Saldo por (produto, obra) joinado com produto/categoria para
        // poder agrupar e calcular valor (qtd × valor_medio).
        $query = DB::table('estoque_saldos as s')
            ->join('estoque_produtos as p', 'p.id', '=', 's.produto_id')
            ->leftJoin('estoque_categorias as c', 'c.id', '=', 'p.categoria_id')
            ->leftJoin('obras as o', 'o.id', '=', 's.obra_id')
            ->where('s.quantidade', '>', 0)
            ->when($companyId, fn ($q) => $q->where('s.company_id', $companyId))
            ->when($obraId, fn ($q, $id) => $q->where('s.obra_id', $id))
            ->when($categoriaId, fn ($q, $id) => $q->where('p.categoria_id', $id));

        $totais = (clone $query)
            ->selectRaw('
                COUNT(DISTINCT s.produto_id) as produtos_count,
                COUNT(DISTINCT s.obra_id) as obras_count,
                SUM(s.quantidade) as qtd_total,
                SUM(s.quantidade * s.valor_medio) as valor_total
            ')
            ->first();

        if ($agruparPor === 'obra') {
            $linhas = (clone $query)
                ->select(
                    's.obra_id',
                    'o.codigo_obra',
                    'o.nome_fantasia',
                    DB::raw('COUNT(DISTINCT s.produto_id) as produtos_count'),
                    DB::raw('SUM(s.quantidade) as qtd_total'),
                    DB::raw('SUM(s.quantidade * s.valor_medio) as valor_total')
                )
                ->groupBy('s.obra_id', 'o.codigo_obra', 'o.nome_fantasia')
                ->orderByDesc('valor_total')
                ->get();
        } else {
            $linhas = (clone $query)
                ->select(
                    'p.categoria_id',
                    'c.nome as categoria_nome',
                    DB::raw('COUNT(DISTINCT s.produto_id) as produtos_count'),
                    DB::raw('SUM(s.quantidade) as qtd_total'),
                    DB::raw('SUM(s.quantidade * s.valor_medio) as valor_total')
                )
                ->groupBy('p.categoria_id', 'c.nome')
                ->orderByDesc('valor_total')
                ->get();
        }

        $maxValor = $linhas->max('valor_total') ?: 1;
        $linhas   = $linhas->map(function ($l) use ($maxValor, $totais) {
            $row = (array) $l;
            $row['qtd_total']   = (float) ($row['qtd_total'] ?? 0);
            $row['valor_total'] = (float) ($row['valor_total'] ?? 0);
            $row['percentual']  = $totais->valor_total > 0
                ? round(($row['valor_total'] / (float) $totais->valor_total) * 100, 1)
                : 0;
            $row['barra']       = $maxValor > 0
                ? round(($row['valor_total'] / $maxValor) * 100, 1)
                : 0;
            return $row;
        });

        return Inertia::render('Admin/Estoque/Relatorios/ValorEstoque', [
            'linhas'      => $linhas,
            'totais'      => [
                'produtos_count' => (int) ($totais->produtos_count ?? 0),
                'obras_count'    => (int) ($totais->obras_count ?? 0),
                'qtd_total'      => (float) ($totais->qtd_total ?? 0),
                'valor_total'    => (float) ($totais->valor_total ?? 0),
            ],
            'agruparPor'  => $agruparPor,
            'obras'       => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'categorias'  => Categoria::orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'filtros'     => [
                'obra_id'      => $obraId,
                'categoria_id' => $categoriaId,
                'agrupar_por'  => $agruparPor,
            ],
        ]);
    }

    // =======================================================================
    // 4) GIRO DE ESTOQUE
    // =======================================================================

    public function giroEstoque(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $filtros   = $this->validarFiltrosPeriodo($request);
        $diasPeriodo = max(1, Carbon::parse($filtros['data_de'])->diffInDays($filtros['data_ate']) + 1);

        // total_saidas no período (em qtd) por produto
        $saidasQ = DB::table('estoque_movimentacoes')
            ->select('produto_id', DB::raw('SUM(quantidade) as total_saidas'))
            ->whereIn('tipo', [Movimentacao::TIPO_SAIDA, Movimentacao::TIPO_TRANSF_OUT])
            ->whereBetween('data_movimento', [$filtros['data_de'], $filtros['data_ate']])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($filtros['obra_id'], fn ($q, $id) => $q->where('obra_id', $id))
            ->groupBy('produto_id');

        // saldo atual por produto (somando obras filtradas)
        $saldoAtualQ = DB::table('estoque_saldos')
            ->select('produto_id', DB::raw('SUM(quantidade) as saldo_atual'),
                     DB::raw('SUM(quantidade * valor_medio) as valor_atual'))
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($filtros['obra_id'], fn ($q, $id) => $q->where('obra_id', $id))
            ->groupBy('produto_id');

        $linhas = DB::table(DB::raw("({$saidasQ->toSql()}) as saidas"))
            ->mergeBindings($saidasQ)
            ->leftJoinSub($saldoAtualQ, 'saldo', 'saldo.produto_id', '=', 'saidas.produto_id')
            ->join('estoque_produtos as p', 'p.id', '=', 'saidas.produto_id')
            ->select(
                'saidas.produto_id',
                'p.sku', 'p.nome', 'p.unidade',
                'saidas.total_saidas',
                DB::raw('COALESCE(saldo.saldo_atual, 0) as saldo_atual'),
                DB::raw('COALESCE(saldo.valor_atual, 0) as valor_atual')
            )
            ->orderByDesc('saidas.total_saidas')
            ->limit(50)
            ->get();

        $linhas = $linhas->map(function ($l) use ($diasPeriodo) {
            $saidasDiaMedia = $l->total_saidas / $diasPeriodo;
            // Giro: saídas / saldo_atual. Cobertura: saldo_atual / saídas-dia
            $giro      = (float) $l->saldo_atual > 0 ? (float) $l->total_saidas / (float) $l->saldo_atual : null;
            $cobertura = $saidasDiaMedia > 0 ? (float) $l->saldo_atual / $saidasDiaMedia : null;
            return [
                'produto_id'   => $l->produto_id,
                'sku'          => $l->sku,
                'nome'         => $l->nome,
                'unidade'      => $l->unidade,
                'total_saidas' => (float) $l->total_saidas,
                'saldo_atual'  => (float) $l->saldo_atual,
                'valor_atual'  => (float) $l->valor_atual,
                'saidas_dia'   => round($saidasDiaMedia, 3),
                'giro'         => $giro !== null ? round($giro, 2) : null,
                'cobertura_dias' => $cobertura !== null && is_finite($cobertura) ? round($cobertura, 1) : null,
            ];
        });

        return Inertia::render('Admin/Estoque/Relatorios/GiroEstoque', [
            'linhas'  => $linhas,
            'dias'    => $diasPeriodo,
            'totais'  => [
                'produtos_count' => $linhas->count(),
                'saidas_total'   => $linhas->sum('total_saidas'),
                'saldo_total'    => $linhas->sum('saldo_atual'),
                'valor_total'    => $linhas->sum('valor_atual'),
            ],
            'obras'   => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                            ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'filtros' => $filtros,
        ]);
    }

    // =======================================================================
    // HELPERS
    // =======================================================================

    /**
     * Lê e valida filtros padrão: data_de, data_ate, obra_id, [extras].
     * Default: últimos 30 dias.
     */
    protected function validarFiltrosPeriodo(Request $request, array $extras = []): array
    {
        $rules = [
            'data_de'  => ['nullable', 'date'],
            'data_ate' => ['nullable', 'date', 'after_or_equal:data_de'],
            'obra_id'  => ['nullable', 'integer'],
        ];
        foreach ($extras as $extra) {
            $rules[$extra] = ['nullable', 'string', 'max:50'];
        }
        $data = $request->validate($rules);

        $data['data_de']  = $data['data_de']  ?? Carbon::today()->subDays(30)->toDateString();
        $data['data_ate'] = $data['data_ate'] ?? Carbon::today()->toDateString();
        $data['obra_id']  = $data['obra_id'] ?? null;
        foreach ($extras as $extra) {
            $data[$extra] = $data[$extra] ?? null;
        }
        return $data;
    }
}
