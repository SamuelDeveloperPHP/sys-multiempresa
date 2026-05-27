<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\ProdutoRequest;
use App\Models\Estoque\Categoria;
use App\Models\Estoque\Produto;
use App\Models\Estoque\Saldo;
use App\Models\Fornecedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * CRUD de produtos — CATÁLOGO GLOBAL (não filtra por empresa).
 * /admin/estoque/produtos
 *
 * O escopo por empresa+obra fica apenas em Saldo / Movimentacao /
 * Requisicao / Inventario, que continuam com company_id.
 */
class ProdutoController extends Controller
{
    public function index(Request $request)
    {
        $query = Produto::query()
            ->with(['categoria:id,nome', 'fornecedorPadrao:id,razao_social']);

        if ($q = $request->input('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('nome', 'like', "%{$q}%")
                  ->orWhere('sku', 'like', "%{$q}%")
                  ->orWhere('codigo_barras', 'like', "%{$q}%")
                  ->orWhere('marca', 'like', "%{$q}%");
            });
        }
        if ($cat = $request->input('categoria_id')) {
            $query->where('categoria_id', $cat);
        }
        if (($ativo = $request->input('ativo')) !== null && $ativo !== '') {
            $query->where('ativo', $ativo === '1');
        }
        if ($request->boolean('abaixo_minimo')) {
            // Filtra apenas saldos da empresa atual (saldo é por empresa)
            $companyId = CompanyContext::current()?->id;
            $query->whereHas('saldos', function ($q) use ($companyId) {
                $q->whereColumn('quantidade', '<', 'estoque_produtos.estoque_minimo');
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
            });
        }

        // Estratégia de paginação otimizada para catálogo grande (100k+):
        //   - Sem filtro de busca → simplePaginate ordenado por id desc
        //     (evita COUNT(*) caro e ORDER BY nome FILESORT)
        //   - Com filtro de busca → paginate normal (resultset já é pequeno),
        //     ordenado por nome (alfabético) para melhor UX
        $temFiltroTexto = $request->filled('q');
        if ($temFiltroTexto) {
            $produtos = $query->orderBy('nome')->paginate(20)->withQueryString();
        } else {
            $produtos = $query->orderByDesc('id')->simplePaginate(20)->withQueryString();
        }

        return Inertia::render('Admin/Estoque/Produtos/Index', [
            'produtos'   => $produtos,
            'categorias' => Categoria::orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'filtros'    => $request->only(['q', 'categoria_id', 'ativo', 'abaixo_minimo']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Estoque/Produtos/Form', [
            'produto'      => null,
            'categorias'   => Categoria::orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'fornecedores' => Fornecedor::orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    public function edit(Produto $produto)
    {
        return Inertia::render('Admin/Estoque/Produtos/Form', [
            'produto'      => $produto,
            'categorias'   => Categoria::orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'fornecedores' => Fornecedor::orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    public function show(Produto $produto)
    {
        $produto->load(['categoria', 'fornecedorPadrao']);

        // Saldo é por empresa+obra. Mostra apenas saldos da empresa atual
        // (o admin de empresa A não precisa ver saldos da empresa B).
        $companyId = CompanyContext::current()?->id;
        $saldosQuery = Saldo::where('produto_id', $produto->id)
            ->with('obra:id,codigo_obra,nome_fantasia');
        if ($companyId) {
            $saldosQuery->where('company_id', $companyId);
        }
        $saldos = $saldosQuery->get();

        return Inertia::render('Admin/Estoque/Produtos/Show', [
            'produto'    => $produto,
            'saldos'     => $saldos,
            'saldoTotal' => $saldos->sum('quantidade'),
            'valorTotal' => $saldos->sum(fn ($s) => (float) $s->quantidade * (float) $s->valor_medio),
        ]);
    }

    public function store(ProdutoRequest $request)
    {
        $data = $request->validated();
        $data['company_id']  = null; // catálogo global
        $data['sku']         = $data['sku'] ?: Produto::gerarSku();
        $data['user_create'] = $request->user()->email;
        $data['ativo']       = $request->boolean('ativo', true);

        if ($request->hasFile('imagem')) {
            $data['imagem'] = $request->file('imagem')->store('estoque/produtos', 'public');
        }

        $produto = Produto::create($data);

        return redirect()->route('admin.estoque.produtos.show', $produto)
            ->with('success', 'Produto criado.');
    }

    public function update(ProdutoRequest $request, Produto $produto)
    {
        $data = $request->validated();
        $data['user_edit'] = $request->user()->email;
        $data['ativo']     = $request->boolean('ativo', true);
        if (empty($data['sku'])) {
            unset($data['sku']);
        }

        if ($request->hasFile('imagem')) {
            if ($produto->imagem) {
                Storage::disk('public')->delete($produto->imagem);
            }
            $data['imagem'] = $request->file('imagem')->store('estoque/produtos', 'public');
        }

        // Produto do catálogo Leroy: preço é SOMENTE REFERÊNCIA — bloqueia edição
        // server-side (defesa em profundidade, além do campo travado no front).
        if ($produto->origem === Produto::ORIGEM_LEROY) {
            unset($data['valor_unitario'], $data['valor_referencia']);
        }

        $produto->update($data);

        return redirect()->route('admin.estoque.produtos.show', $produto)
            ->with('success', 'Produto atualizado.');
    }

    public function destroy(Produto $produto)
    {
        // Não exclui se tem movimentações em qualquer empresa
        if ($produto->movimentacoes()->exists()) {
            return back()->with('error', 'Produto tem movimentações. Desative ao invés de excluir.');
        }

        $produto->delete();
        return redirect()->route('admin.estoque.produtos.index')
            ->with('success', 'Produto excluído.');
    }
}
