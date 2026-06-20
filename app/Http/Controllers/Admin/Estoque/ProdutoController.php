<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\ProdutoRequest;
use App\Models\Estoque\Categoria;
use App\Models\Estoque\Produto;
use App\Models\Estoque\ProdutoVariacao;
use App\Models\Estoque\Saldo;
use App\Models\Fornecedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $produto->load('variacoes');

        return Inertia::render('Admin/Estoque/Produtos/Form', [
            'produto'      => $this->produtoComVariacoes($produto),
            'categorias'   => Categoria::orderBy('nome')->get(['id', 'nome', 'parent_id']),
            'fornecedores' => Fornecedor::orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    public function show(Produto $produto)
    {
        $produto->load(['categoria', 'fornecedorPadrao', 'variacoes']);

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
            'produto'    => $this->produtoComVariacoes($produto),
            'saldos'     => $saldos,
            'saldoTotal' => $saldos->sum('quantidade'),
            'valorTotal' => $saldos->sum(fn ($s) => (float) $s->quantidade * (float) $s->valor_medio),
        ]);
    }

    /**
     * Serializa o produto incluindo as listas de variação já separadas por
     * tipo (cores / tamanhos_numericos / tamanhos_vestuario), prontas para o
     * front popular os chips.
     */
    protected function produtoComVariacoes(Produto $produto): array
    {
        $arr = $produto->toArray();
        $arr['cores']              = $produto->cores()->all();
        $arr['tamanhos_numericos'] = $produto->tamanhosNumericos()->all();
        $arr['tamanhos_vestuario'] = $produto->tamanhosVestuario()->all();
        return $arr;
    }

    public function store(ProdutoRequest $request)
    {
        $data = $request->validated();
        $data['company_id']  = null; // catálogo global
        $data['sku']         = ($data['sku'] ?? '') ?: Produto::gerarSku();
        $data['user_create'] = $request->user()->email;
        $data['ativo']       = $request->boolean('ativo', true);

        // Classificação + flag derivada
        $data['tipo_item']         = $data['tipo_item'] ?? Produto::TIPO_MATERIAL;
        $data['controla_variacao'] = $data['tipo_item'] !== Produto::TIPO_MATERIAL;

        if ($request->hasFile('imagem')) {
            $data['imagem'] = $request->file('imagem')->store('estoque/produtos', 'public');
        }

        // Separa as listas de variação (não são colunas de produtos)
        $variacoes = $this->extrairVariacoes($request, $data);

        $produto = DB::transaction(function () use ($data, $variacoes) {
            $produto = Produto::create($data);
            $this->sincronizarVariacoes($produto, $variacoes);
            return $produto;
        });

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

        // Classificação + flag derivada
        $data['tipo_item']         = $data['tipo_item'] ?? $produto->tipo_item ?? Produto::TIPO_MATERIAL;
        $data['controla_variacao'] = $data['tipo_item'] !== Produto::TIPO_MATERIAL;

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

        $variacoes = $this->extrairVariacoes($request, $data);

        DB::transaction(function () use ($produto, $data, $variacoes) {
            $produto->update($data);
            $this->sincronizarVariacoes($produto, $variacoes);
        });

        return redirect()->route('admin.estoque.produtos.show', $produto)
            ->with('success', 'Produto atualizado.');
    }

    /**
     * Remove as chaves de variação do $data (para não tentar persistir como
     * coluna) e retorna a estrutura normalizada por tipo.
     */
    protected function extrairVariacoes(Request $request, array &$data): array
    {
        unset($data['cores'], $data['tamanhos_numericos'], $data['tamanhos_vestuario']);

        // Material comum não tem variação — devolve listas vazias (limpa o que houver)
        if (($data['tipo_item'] ?? Produto::TIPO_MATERIAL) === Produto::TIPO_MATERIAL) {
            return [
                ProdutoVariacao::TIPO_COR               => [],
                ProdutoVariacao::TIPO_TAMANHO_NUMERICO  => [],
                ProdutoVariacao::TIPO_TAMANHO_VESTUARIO => [],
            ];
        }

        $limpar = fn ($arr) => collect($arr ?? [])
            ->map(fn ($v) => trim((string) $v))
            ->filter()
            ->unique()
            ->values()
            ->all();

        return [
            ProdutoVariacao::TIPO_COR               => $limpar($request->input('cores')),
            ProdutoVariacao::TIPO_TAMANHO_NUMERICO  => $limpar($request->input('tamanhos_numericos')),
            ProdutoVariacao::TIPO_TAMANHO_VESTUARIO => $limpar($request->input('tamanhos_vestuario')),
        ];
    }

    /**
     * Substitui as variações do produto pelas novas listas (estratégia
     * delete-and-reinsert — listas pequenas, catálogo global).
     */
    protected function sincronizarVariacoes(Produto $produto, array $variacoes): void
    {
        $produto->variacoes()->delete();

        $rows = [];
        foreach ($variacoes as $tipo => $valores) {
            foreach ($valores as $ordem => $valor) {
                $rows[] = [
                    'produto_id' => $produto->id,
                    'tipo'       => $tipo,
                    'valor'      => $valor,
                    'ordem'      => $ordem,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if (!empty($rows)) {
            ProdutoVariacao::insert($rows);
        }
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
