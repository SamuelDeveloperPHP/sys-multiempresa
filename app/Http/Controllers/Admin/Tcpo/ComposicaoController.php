<?php

namespace App\Http\Controllers\Admin\Tcpo;

use App\Http\Controllers\Controller;
use App\Models\Tcpo\TcpoCategoria;
use App\Models\Tcpo\TcpoComposicao;
use App\Models\Tcpo\TcpoInsumo;
use App\Services\Tcpo\TcpoXlsxExport;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Navegação do catálogo TCPO importado (composições/serviços). Somente leitura
 * — o catálogo é populado pela importação (tcpo:importar-*). Global, sem escopo
 * por empresa.
 */
class ComposicaoController extends Controller
{
    public function index(Request $request)
    {
        $ctx = $this->filtrar($request);

        $composicoes = $ctx['query']->orderBy('codigo_alt')->orderBy('codigo')
            ->paginate(20)->withQueryString();

        return Inertia::render('Admin/Tcpo/Composicoes/Index', [
            'composicoes' => $composicoes,
            'arvore'      => $ctx['arvore'],
            'caminho'     => $ctx['caminho'],
            'bases'       => TcpoComposicao::query()->select('base')->distinct()->orderBy('base')->pluck('base'),
            'tipos'       => TcpoComposicao::query()->whereNotNull('tipo')->select('tipo')->distinct()->orderBy('tipo')->pluck('tipo'),
            'filtros'     => $request->only(['q', 'base', 'tipo', 'categoria_id']),
            'totais'      => [
                'composicoes' => TcpoComposicao::count(),
                'insumos'     => TcpoInsumo::count(),
            ],
        ]);
    }

    public function show(TcpoComposicao $composicao)
    {
        $composicao->load([
            'categoria',
            'itens' => fn ($q) => $q->orderBy('ordem'),
            'itens.insumo:id,codigo,descricao,classe',
        ]);

        return Inertia::render('Admin/Tcpo/Composicoes/Show', [
            'composicao' => $composicao,
        ]);
    }

    /**
     * Exporta a lista filtrada de composições em CSV (separador ';', BOM UTF-8,
     * decimal com vírgula — abre direto no Excel pt-BR). Respeita q/base/tipo/categoria.
     */
    public function exportarCsv(Request $request)
    {
        $ctx  = $this->filtrar($request);
        $rows = $ctx['query']->orderBy('codigo_alt')->orderBy('codigo')->get();

        // mapa id -> caminho completo da categoria (memoizado)
        $byId = $ctx['cats']->keyBy('id');
        $cache = [];
        $pathOf = function ($id) use (&$pathOf, $byId, &$cache) {
            if (!$id) {
                return '';
            }
            if (isset($cache[$id])) {
                return $cache[$id];
            }
            $c = $byId->get($id);
            if (!$c) {
                return '';
            }
            $pai = $c->parent_id ? $pathOf($c->parent_id) : '';
            return $cache[$id] = ($pai ? $pai . ' > ' : '') . $c->nome;
        };

        $nome = 'tcpo_composicoes_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($rows, $pathOf) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM
            fputcsv($out, ['Código EAP', 'Código', 'Descrição', 'Unidade', 'Tipo', 'Categoria', 'Base', 'Total sem taxas'], ';');
            foreach ($rows as $c) {
                fputcsv($out, [
                    $c->codigo_alt ?: $c->codigo,
                    $c->codigo,
                    $c->descricao,
                    $c->unidade,
                    $c->tipo,
                    $pathOf($c->categoria_id),
                    $c->base,
                    $c->total_sem_taxas !== null ? number_format((float) $c->total_sem_taxas, 2, ',', '') : '',
                ], ';');
            }
            fclose($out);
        }, $nome, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $nome . '"',
        ]);
    }

    /**
     * Exporta a BASE TODA em xlsx (2 abas: blocos por composição + itens flat),
     * no formato do modelo PINI. Ignora filtros (é o catálogo completo).
     */
    public function exportarXlsxBase(TcpoXlsxExport $export)
    {
        $path = $export->gerar();
        $nome = 'tcpo_base_completa_' . now()->format('Y-m-d_His') . '.xlsx';

        return response()->download($path, $nome, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Monta a árvore de categorias + a query já filtrada (q/base/tipo/categoria
     * com descendentes) + o breadcrumb. Compartilhado por index() e exportarCsv().
     */
    private function filtrar(Request $request): array
    {
        $base = $request->input('base');

        $cats = TcpoCategoria::query()
            ->when($base, fn ($q) => $q->where('base', $base))
            ->orderBy('nivel')->orderBy('codigo')->orderBy('nome')
            ->get(['id', 'nome', 'parent_id', 'codigo']);

        $porPai = [];
        foreach ($cats as $c) {
            $porPai[$c->parent_id][] = $c;
        }
        $montaArvore = function ($paiId) use (&$montaArvore, $porPai) {
            $nos = [];
            foreach ($porPai[$paiId] ?? [] as $c) {
                $nos[] = ['id' => $c->id, 'nome' => $c->nome, 'codigo' => $c->codigo, 'children' => $montaArvore($c->id)];
            }
            return $nos;
        };
        $arvore = $montaArvore(null);

        $query = TcpoComposicao::query()->with('categoria:id,nome');

        if ($q = trim((string) $request->input('q'))) {
            $query->where(function ($w) use ($q) {
                $w->where('codigo', 'like', "%{$q}%")
                  ->orWhere('codigo_alt', 'like', "%{$q}%")
                  ->orWhere('descricao', 'like', "%{$q}%");
            });
        }
        if ($base) {
            $query->where('base', $base);
        }
        if ($tipo = $request->input('tipo')) {
            $query->where('tipo', $tipo);
        }

        $caminho = [];
        if ($catId = (int) $request->input('categoria_id')) {
            $ids = [];
            $coleta = function ($id) use (&$coleta, $porPai, &$ids) {
                $ids[] = $id;
                foreach ($porPai[$id] ?? [] as $ch) {
                    $coleta($ch->id);
                }
            };
            $coleta($catId);
            $query->whereIn('categoria_id', $ids);

            $no = $cats->firstWhere('id', $catId);
            while ($no) {
                array_unshift($caminho, ['id' => $no->id, 'nome' => $no->nome]);
                $no = $no->parent_id ? $cats->firstWhere('id', $no->parent_id) : null;
            }
        }

        return ['query' => $query, 'arvore' => $arvore, 'caminho' => $caminho, 'cats' => $cats, 'porPai' => $porPai];
    }
}
