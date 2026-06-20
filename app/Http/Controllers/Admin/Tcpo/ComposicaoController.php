<?php

namespace App\Http\Controllers\Admin\Tcpo;

use App\Http\Controllers\Controller;
use App\Models\Tcpo\TcpoCategoria;
use App\Models\Tcpo\TcpoComposicao;
use App\Models\Tcpo\TcpoInsumo;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Navegação do catálogo TCPO importado (composições/serviços). Somente leitura
 * — o catálogo é populado pela importação (tcpo:importar). Global, sem escopo
 * por empresa.
 */
class ComposicaoController extends Controller
{
    public function index(Request $request)
    {
        $base = $request->input('base');

        // --- Árvore de categorias (para navegação tipo TCPOweb) ---
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

        // --- Filtro por categoria (inclui descendentes) + breadcrumb ---
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

        $composicoes = $query->orderBy('codigo_alt')->orderBy('codigo')
            ->paginate(20)->withQueryString();

        return Inertia::render('Admin/Tcpo/Composicoes/Index', [
            'composicoes'   => $composicoes,
            'arvore'        => $arvore,
            'caminho'       => $caminho,
            'bases'         => TcpoComposicao::query()->select('base')->distinct()->orderBy('base')->pluck('base'),
            'tipos'         => TcpoComposicao::query()->whereNotNull('tipo')->select('tipo')->distinct()->orderBy('tipo')->pluck('tipo'),
            'filtros'       => $request->only(['q', 'base', 'tipo', 'categoria_id']),
            'totais'        => [
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
}
