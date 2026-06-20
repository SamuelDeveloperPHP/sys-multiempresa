<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Categoria;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Saldos por obra — visão completa do catálogo × obra escolhida.
 *
 * REGRA DE NEGÓCIO: o catálogo de produtos é GLOBAL (não por empresa).
 * Esta tela deve listar TODOS os produtos do catálogo para a obra
 * escolhida, mesmo aqueles sem saldo (qtd = 0, valor = 0).
 *
 * Implementação: LEFT JOIN produtos × estoque_saldos.
 *
 * Filtros: obra (obrigatória), categoria, busca livre (SKU/nome),
 * situação (com/sem saldo, abaixo do mínimo, crítico), toggle inativos.
 *
 * Ordenação configurável por coluna. Default: valor total desc
 * (itens caros primeiro).
 */
class SaldoController extends Controller
{
    /**
     * GET /admin/estoque/saldos
     */
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        // Lookups + filtros aceitos
        $filtros = $this->normalizarFiltros($request);

        // Sem obra escolhida, devolve a tela com a lista vazia (operador
        // precisa escolher uma obra antes de listar para evitar consulta
        // com 1800 SKUs × dezenas de obras).
        $produtos = collect();
        $kpis     = $this->kpisVazios();

        if ($filtros['obra_id']) {
            [$produtos, $kpis] = $this->montarConsulta($filtros, $companyId, $paginar = true);
        }

        return Inertia::render('Admin/Estoque/Saldos/Index', [
            'produtos'   => $produtos,
            'kpis'       => $kpis,
            'obras'      => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                ->orderBy('codigo_obra')
                                ->get(['id', 'codigo_obra', 'nome_fantasia']),
            'categorias' => Categoria::orderBy('nome')->get(['id', 'nome']),
            'filtros'    => $filtros,
        ]);
    }

    /**
     * GET /admin/estoque/saldos/exportar — CSV com a mesma query da tela.
     * Stream para evitar carregar 10k+ linhas em memória.
     */
    public function exportar(Request $request): StreamedResponse
    {
        $companyId = CompanyContext::current()?->id;
        $filtros   = $this->normalizarFiltros($request);
        abort_if(!$filtros['obra_id'], 422, 'Selecione uma obra antes de exportar.');

        [$itens] = $this->montarConsulta($filtros, $companyId, $paginar = false);

        $obraStr = $filtros['obra_id'];
        $nome = "saldos-obra-{$obraStr}-" . now()->format('Y-m-d') . '.csv';

        return Response::streamDownload(function () use ($itens) {
            $out = fopen('php://output', 'w');
            // BOM UTF-8 para abrir bonito no Excel BR
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'SKU', 'Produto', 'Categoria', 'Unidade',
                'Quantidade', 'PMP (R$)', 'Valor Total (R$)',
                'Estoque Mínimo', 'Situação', 'Última Movimentação',
            ], ';');
            foreach ($itens as $r) {
                fputcsv($out, [
                    $r->sku,
                    $r->nome,
                    $r->categoria ?? '',
                    $r->unidade,
                    number_format((float) $r->quantidade, 3, ',', '.'),
                    number_format((float) $r->valor_medio, 2, ',', '.'),
                    number_format((float) $r->valor_total, 2, ',', '.'),
                    $r->estoque_minimo !== null ? number_format((float) $r->estoque_minimo, 3, ',', '.') : 'não inf.',
                    $this->situacaoTexto($r),
                    $r->ultima_movimentacao_at ?? '',
                ], ';');
            }
            fclose($out);
        }, $nome, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /* =========================================================
     * QUERY BUILDER (compartilhado entre index e exportar)
     * ========================================================= */

    /**
     * Retorna [paginator|collection, kpis] aplicando todos os filtros.
     */
    protected function montarConsulta(array $filtros, ?int $companyId, bool $paginar): array
    {
        $obraId   = (int) $filtros['obra_id'];
        $sortCol  = $filtros['sort'] ?? 'valor_total';
        $sortDir  = $filtros['dir']  === 'asc' ? 'asc' : 'desc';

        // Mapa coluna do front → coluna real no SQL
        $colMap = [
            'nome'         => 'p.nome',
            'sku'          => 'p.sku',
            'quantidade'   => 'quantidade',
            'valor_medio'  => 'valor_medio',
            'valor_total'  => 'valor_total',
            'estoque_minimo' => 'p.estoque_minimo',
            'ultima'       => 's.ultima_movimentacao_at',
        ];
        $sortSql = $colMap[$sortCol] ?? 'valor_total';

        $base = DB::table('estoque_produtos as p')
            ->leftJoin('estoque_saldos as s', function ($j) use ($obraId, $companyId) {
                $j->on('s.produto_id', '=', 'p.id')
                  ->where('s.obra_id', $obraId);
                if ($companyId) $j->where('s.company_id', $companyId);
            })
            ->leftJoin('estoque_categorias as c', 'c.id', '=', 'p.categoria_id')
            ->whereNull('p.deleted_at');

        // Filtros de produto
        if (!$filtros['mostrar_inativos']) {
            $base->where('p.ativo', true);
        }
        if (!empty($filtros['categoria_id'])) {
            $base->where('p.categoria_id', $filtros['categoria_id']);
        }
        if (!empty($filtros['q'])) {
            $q = '%' . $filtros['q'] . '%';
            $base->where(function ($w) use ($q) {
                $w->where('p.nome', 'like', $q)
                  ->orWhere('p.sku', 'like', $q)
                  ->orWhere('p.codigo_barras', 'like', $q);
            });
        }

        // Filtro de SITUAÇÃO (após o JOIN, sobre o saldo)
        // - com_saldo    : quantidade > 0
        // - sem_saldo    : quantidade = 0 OU null
        // - abaixo_min   : 0 < quantidade < estoque_minimo
        // - critico      : quantidade = 0 E estoque_minimo > 0
        $sit = $filtros['situacao'] ?? null;
        if ($sit === 'com_saldo') {
            $base->whereRaw('COALESCE(s.quantidade, 0) > 0');
        } elseif ($sit === 'sem_saldo') {
            $base->whereRaw('COALESCE(s.quantidade, 0) = 0');
        } elseif ($sit === 'abaixo_min') {
            $base->whereNotNull('p.estoque_minimo')
                 ->whereRaw('COALESCE(s.quantidade, 0) < p.estoque_minimo')
                 ->whereRaw('COALESCE(s.quantidade, 0) > 0');
        } elseif ($sit === 'critico') {
            $base->whereNotNull('p.estoque_minimo')
                 ->where('p.estoque_minimo', '>', 0)
                 ->whereRaw('COALESCE(s.quantidade, 0) = 0');
        }

        $select = $base->clone()->selectRaw('
            p.id, p.sku, p.nome, p.unidade, p.imagem, p.ativo, p.codigo_barras,
            p.estoque_minimo, p.estoque_maximo, p.valor_unitario,
            c.nome as categoria,
            COALESCE(s.quantidade, 0)                                    as quantidade,
            COALESCE(s.valor_medio, 0)                                   as valor_medio,
            COALESCE(s.quantidade, 0) * COALESCE(s.valor_medio, 0)       as valor_total,
            s.ultima_movimentacao_at,
            CASE
                WHEN COALESCE(s.quantidade, 0) = 0 AND p.estoque_minimo IS NOT NULL AND p.estoque_minimo > 0 THEN \'critico\'
                WHEN p.estoque_minimo IS NOT NULL AND COALESCE(s.quantidade, 0) < p.estoque_minimo THEN \'abaixo_min\'
                WHEN p.estoque_minimo IS NULL THEN \'sem_min\'
                ELSE \'ok\'
            END as situacao
        ')->orderBy($sortSql, $sortDir)->orderBy('p.nome');

        // ============= KPIs (agregados sobre o mesmo filtro) =============
        $kpisRaw = $base->clone()->selectRaw('
            COUNT(*)                                                          as total_skus,
            SUM(CASE WHEN COALESCE(s.quantidade, 0) >  0 THEN 1 ELSE 0 END)   as com_saldo,
            SUM(CASE WHEN COALESCE(s.quantidade, 0) =  0 THEN 1 ELSE 0 END)   as sem_saldo,
            SUM(CASE
                WHEN p.estoque_minimo IS NOT NULL
                 AND COALESCE(s.quantidade, 0) < p.estoque_minimo
                THEN 1 ELSE 0
            END)                                                              as abaixo_min,
            SUM(CASE
                WHEN p.estoque_minimo IS NOT NULL
                 AND p.estoque_minimo > 0
                 AND COALESCE(s.quantidade, 0) = 0
                THEN 1 ELSE 0
            END)                                                              as critico,
            COALESCE(SUM(COALESCE(s.quantidade, 0) * COALESCE(s.valor_medio, 0)), 0) as valor_total
        ')->first();

        $kpis = [
            'total_skus' => (int)   ($kpisRaw->total_skus ?? 0),
            'com_saldo'  => (int)   ($kpisRaw->com_saldo ?? 0),
            'sem_saldo'  => (int)   ($kpisRaw->sem_saldo ?? 0),
            'abaixo_min' => (int)   ($kpisRaw->abaixo_min ?? 0),
            'critico'    => (int)   ($kpisRaw->critico ?? 0),
            'valor_total' => (float)($kpisRaw->valor_total ?? 0),
        ];

        $resultado = $paginar
            ? $select->paginate(50)->withQueryString()
            : $select->get();

        return [$resultado, $kpis];
    }

    /* =========================================================
     * Helpers
     * ========================================================= */

    protected function normalizarFiltros(Request $request): array
    {
        return [
            'obra_id'         => $request->input('obra_id'),
            'categoria_id'    => $request->input('categoria_id'),
            'q'               => trim((string) $request->input('q', '')),
            'situacao'        => $request->input('situacao', 'todos'),
            'mostrar_inativos'=> $request->boolean('mostrar_inativos'),
            'sort'            => $request->input('sort', 'valor_total'),
            'dir'             => $request->input('dir', 'desc'),
        ];
    }

    protected function kpisVazios(): array
    {
        return [
            'total_skus' => 0, 'com_saldo' => 0, 'sem_saldo' => 0,
            'abaixo_min' => 0, 'critico' => 0, 'valor_total' => 0,
        ];
    }

    protected function situacaoTexto($r): string
    {
        return match (true) {
            (float) $r->quantidade === 0.0 && $r->estoque_minimo !== null && (float) $r->estoque_minimo > 0 => 'Crítico (zero)',
            $r->estoque_minimo !== null && (float) $r->quantidade < (float) $r->estoque_minimo            => 'Abaixo do mínimo',
            $r->estoque_minimo === null                                                                    => 'Sem mínimo',
            default                                                                                        => 'OK',
        };
    }
}
