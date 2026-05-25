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
 * CRUD de produtos do catálogo. /admin/estoque/produtos
 */
class ProdutoController extends Controller
{
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        $query = Produto::query()
            ->where('company_id', $companyId)
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
        if ($ativo = $request->input('ativo')) {
            $query->where('ativo', $ativo === '1');
        }
        if ($request->boolean('abaixo_minimo')) {
            // Sub-query: produtos com algum saldo abaixo do mínimo
            $query->whereHas('saldos', function ($q) {
                $q->whereColumn('quantidade', '<', 'estoque_produtos.estoque_minimo');
            });
        }

        $produtos = $query->orderBy('nome')->paginate(20)->withQueryString();

        return Inertia::render('Admin/Estoque/Produtos/Index', [
            'produtos'    => $produtos,
            'categorias'  => Categoria::where('company_id', $companyId)->orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'filtros'     => $request->only(['q', 'categoria_id', 'ativo', 'abaixo_minimo']),
        ]);
    }

    public function create()
    {
        $companyId = CompanyContext::current()?->id;
        return Inertia::render('Admin/Estoque/Produtos/Form', [
            'produto'      => null,
            'categorias'   => Categoria::where('company_id', $companyId)->orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'fornecedores' => Fornecedor::where('company_id', $companyId)->orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    public function edit(Produto $produto)
    {
        abort_if($produto->company_id !== CompanyContext::current()?->id, 403);
        $companyId = $produto->company_id;
        return Inertia::render('Admin/Estoque/Produtos/Form', [
            'produto'      => $produto,
            'categorias'   => Categoria::where('company_id', $companyId)->orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'fornecedores' => Fornecedor::where('company_id', $companyId)->orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    public function show(Produto $produto)
    {
        abort_if($produto->company_id !== CompanyContext::current()?->id, 403);

        $produto->load(['categoria', 'fornecedorPadrao']);
        $saldos = Saldo::where('produto_id', $produto->id)
            ->with('obra:id,codigo_obra,nome')
            ->get();

        return Inertia::render('Admin/Estoque/Produtos/Show', [
            'produto'      => $produto,
            'saldos'       => $saldos,
            'saldoTotal'   => $saldos->sum('quantidade'),
            'valorTotal'   => $saldos->sum(fn ($s) => (float) $s->quantidade * (float) $s->valor_medio),
        ]);
    }

    public function store(ProdutoRequest $request)
    {
        $companyId = CompanyContext::current()?->id;

        $data = $request->validated();
        $data['company_id']  = $companyId;
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
        abort_if($produto->company_id !== CompanyContext::current()?->id, 403);

        $data = $request->validated();
        $data['user_edit'] = $request->user()->email;
        $data['ativo']     = $request->boolean('ativo', true);
        // sku vazio = mantém o atual (não regera)
        if (empty($data['sku'])) {
            unset($data['sku']);
        }

        if ($request->hasFile('imagem')) {
            // Remove a antiga
            if ($produto->imagem) {
                Storage::disk('public')->delete($produto->imagem);
            }
            $data['imagem'] = $request->file('imagem')->store('estoque/produtos', 'public');
        }

        $produto->update($data);

        return redirect()->route('admin.estoque.produtos.show', $produto)
            ->with('success', 'Produto atualizado.');
    }

    public function destroy(Produto $produto)
    {
        abort_if($produto->company_id !== CompanyContext::current()?->id, 403);

        // Não deixa excluir se tem movimentações (preserva histórico)
        if ($produto->movimentacoes()->exists()) {
            return back()->with('error', 'Produto tem movimentações. Desative ao invés de excluir.');
        }

        $produto->delete();
        return redirect()->route('admin.estoque.produtos.index')
            ->with('success', 'Produto excluído.');
    }
}
