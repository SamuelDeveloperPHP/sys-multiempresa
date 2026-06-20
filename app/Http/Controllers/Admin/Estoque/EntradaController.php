<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Helpers\ObraContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Lote;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\ProdutoVariacao;
use App\Models\Estoque\ProdutoVariante;
use App\Models\Fornecedor;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Entradas de estoque — tela dedicada para TIPO_ENTRADA.
 *
 * Operação do almoxarife: compra recebida do fornecedor, doação, etc.
 * NÃO exige retirante (é o oposto da saída).
 *
 * Atualiza `valor_ultima_entrada` do produto quando informa unitário,
 * para servir de default na próxima entrada (igual ao Controller original).
 */
class EntradaController extends Controller
{
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        $query = Movimentacao::query()
            ->where('tipo', Movimentacao::TIPO_ENTRADA)
            ->with([
                'produto:id,sku,nome,unidade',
                'obra:id,codigo_obra,nome_fantasia',
                'fornecedor:id,razao_social',
            ]);

        if ($companyId) $query->where('company_id', $companyId);
        if ($obra = $request->input('obra_id'))       $query->where('obra_id', $obra);
        if ($fornec = $request->input('fornecedor_id')) $query->where('fornecedor_id', $fornec);
        if ($q = $request->input('q')) {
            $query->whereHas('produto', fn ($w) =>
                $w->where('nome', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"));
        }
        if ($de  = $request->input('data_de'))  $query->whereDate('data_movimento', '>=', $de);
        if ($ate = $request->input('data_ate')) $query->whereDate('data_movimento', '<=', $ate);

        $entradas = $query->orderByDesc('id')->simplePaginate(25)->withQueryString();

        return Inertia::render('Admin/Estoque/Entradas/Index', [
            'entradas'     => $entradas,
            'obras'        => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'fornecedores' => Fornecedor::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('razao_social')->get(['id', 'razao_social']),
            'filtros'      => $request->only(['obra_id', 'fornecedor_id', 'q', 'data_de', 'data_ate']),
        ]);
    }

    public function create(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $isSuper   = $request->user()->type === 'super_admin';
        $obraAtual = ObraContext::current();

        // super_admin escolhe entre todas as obras da empresa; os demais
        // recebem na obra em que estão logados (fixa).
        $obras = $isSuper
            ? Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia'])
            : ObraContext::userObras()->map(fn ($o) => $o->only(['id', 'codigo_obra', 'nome_fantasia']))->values();

        return Inertia::render('Admin/Estoque/Entradas/Form', [
            'obras'        => $obras,
            'obra_atual'   => $obraAtual?->only(['id', 'codigo_obra', 'nome_fantasia']),
            'is_super'     => $isSuper,
            'fornecedores' => Fornecedor::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    /**
     * Detalhes de uma entrada (movimentação ENTRADA), com variante/lote.
     */
    public function show(Movimentacao $movimentacao)
    {
        $this->garanteEntrada($movimentacao);

        $movimentacao->load([
            'produto:id,sku,nome,unidade,imagem,tipo_item',
            'obra:id,codigo_obra,nome_fantasia',
            'fornecedor:id,razao_social,nome_fantasia',
            'variante:id,cor,tamanho',
            'lote:id,numero_ca,numero_lote,validade,especificacao_tecnica,quantidade_inicial,quantidade_atual',
        ]);

        return Inertia::render('Admin/Estoque/Entradas/Show', [
            'entrada' => $movimentacao,
        ]);
    }

    /**
     * Formulário de edição de uma entrada.
     */
    public function edit(Movimentacao $movimentacao)
    {
        $this->garanteEntrada($movimentacao);
        $companyId = CompanyContext::current()?->id;

        $movimentacao->load([
            'produto:id,sku,nome,unidade,imagem,tipo_item',
            'variante:id,cor,tamanho',
            'lote:id,numero_ca,numero_lote,validade,especificacao_tecnica,quantidade_inicial,quantidade_atual',
        ]);

        return Inertia::render('Admin/Estoque/Entradas/Edit', [
            'entrada'      => $movimentacao,
            'obras'        => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'fornecedores' => Fornecedor::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                  ->orderBy('razao_social')->get(['id', 'razao_social', 'nome_fantasia']),
        ]);
    }

    /**
     * Atualiza uma entrada. O saldo é reajustado pelo Observer ao salvar a
     * movimentação (reverte o delta antigo e aplica o novo). Para EPI, o lote
     * é sincronizado (quantidade e metadados). Produto/variante não mudam aqui.
     */
    public function update(Request $request, Movimentacao $movimentacao)
    {
        $this->garanteEntrada($movimentacao);

        $data = $request->validate([
            'obra_id'          => ['required', 'integer', Rule::exists('obras', 'id')],
            'quantidade'       => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'valor_unitario'   => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'data_movimento'   => ['required', 'date', 'before_or_equal:today'],
            'observacao'       => ['nullable', 'string', 'max:1000'],
            'fornecedor_id'    => ['nullable', 'integer', Rule::exists('fornecedores', 'id')],
            'nota_fiscal'      => ['nullable', 'string', 'max:50'],
            'data_nota_fiscal' => ['nullable', 'date'],
            // Metadados do lote (EPI)
            'numero_ca'             => ['nullable', 'string', 'max:30'],
            'numero_lote'           => ['nullable', 'string', 'max:60'],
            'validade'              => ['nullable', 'date'],
            'especificacao_tecnica' => ['nullable', 'string', 'max:2000'],
        ]);

        abort_unless(ObraContext::userCanAccess((int) $data['obra_id']), 403,
            'Você não tem acesso a esta obra.');

        $lote = $movimentacao->lote;

        // Guarda do lote: não permite reduzir abaixo do que já foi consumido.
        if ($lote) {
            $delta       = (float) $data['quantidade'] - (float) $movimentacao->quantidade;
            $novoAtual   = (float) $lote->quantidade_atual + $delta;
            if ($novoAtual < 0) {
                $consumido = (float) $lote->quantidade_inicial - (float) $lote->quantidade_atual;
                throw ValidationException::withMessages([
                    'quantidade' => sprintf(
                        'Não é possível reduzir abaixo do já retirado deste lote (%s já consumido).',
                        number_format($consumido, 3, ',', '.')
                    ),
                ]);
            }
        }

        $valorUnit  = (float) ($data['valor_unitario'] ?? 0);
        $valorTotal = (float) $data['quantidade'] * $valorUnit;

        DB::transaction(function () use ($movimentacao, $data, $valorUnit, $valorTotal, $lote) {
            $movimentacao->update([
                'obra_id'          => $data['obra_id'],
                'quantidade'       => $data['quantidade'],
                'valor_unitario'   => $valorUnit,
                'valor_total'      => $valorTotal,
                'data_movimento'   => $data['data_movimento'],
                'observacao'       => $data['observacao'] ?? null,
                'fornecedor_id'    => $data['fornecedor_id'] ?? null,
                'nota_fiscal'      => $data['nota_fiscal'] ?? null,
                'data_nota_fiscal' => $data['data_nota_fiscal'] ?? null,
                'user_edit'        => Auth::user()->email,
            ]); // dispara o Observer → reajusta saldo

            if ($lote) {
                $delta = (float) $data['quantidade'] - (float) $lote->quantidade_inicial;
                $lote->update([
                    'obra_id'               => $data['obra_id'],
                    'numero_ca'             => $data['numero_ca']   ?? null,
                    'numero_lote'           => $data['numero_lote'] ?? null,
                    'validade'              => $data['validade']    ?? null,
                    'especificacao_tecnica' => $data['especificacao_tecnica'] ?? null,
                    'valor_unitario'        => $valorUnit,
                    'quantidade_inicial'    => $data['quantidade'],
                    'quantidade_atual'      => (float) $lote->quantidade_atual + $delta,
                    'fornecedor_id'         => $data['fornecedor_id'] ?? null,
                ]);
            }
        });

        if ($valorUnit > 0) {
            Produto::where('id', $movimentacao->produto_id)->update(['valor_ultima_entrada' => $valorUnit]);
        }

        return redirect()->route('admin.estoque.entradas.show', $movimentacao)
            ->with('success', 'Entrada atualizada. Saldo recalculado.');
    }

    /** Garante que a movimentação é uma ENTRADA da empresa atual. */
    private function garanteEntrada(Movimentacao $mov): void
    {
        abort_unless($mov->tipo === Movimentacao::TIPO_ENTRADA, 404, 'Movimentação não é uma entrada.');
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $mov->company_id && (int) $mov->company_id !== (int) $companyId, 403);
    }

    /**
     * Recebimento multi-item: 1 cabeçalho (obra, data, fornecedor, NF) + N
     * itens (cada um pode ser material comum ou EPI com sua combinação
     * cor/tamanho + CA/lote/validade). Tudo gravado numa única transação.
     */
    public function store(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de lançar entrada.');

        $data = $request->validate([
            // Cabeçalho do recebimento (compartilhado por todos os itens)
            'obra_id'          => ['required', 'integer', Rule::exists('obras', 'id')],
            'data_movimento'   => ['required', 'date', 'before_or_equal:today'],
            'fornecedor_id'    => ['nullable', 'integer', Rule::exists('fornecedores', 'id')],
            'nota_fiscal'      => ['nullable', 'string', 'max:50'],
            'data_nota_fiscal' => ['nullable', 'date'],
            // Itens
            'itens'                          => ['required', 'array', 'min:1'],
            'itens.*.produto_id'             => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'itens.*.tipo_item'              => ['nullable', Rule::in(array_keys(Produto::TIPOS_ITEM))],
            'itens.*.quantidade'             => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'itens.*.valor_unitario'         => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'itens.*.cor'                    => ['nullable', 'string', 'max:50'],
            'itens.*.tamanho'                => ['nullable', 'string', 'max:20'],
            'itens.*.numero_ca'              => ['nullable', 'string', 'max:30'],
            'itens.*.numero_lote'            => ['nullable', 'string', 'max:60'],
            'itens.*.validade'               => ['nullable', 'date'],
            'itens.*.especificacao_tecnica'  => ['nullable', 'string', 'max:2000'],
            'itens.*.observacao'             => ['nullable', 'string', 'max:1000'],
        ]);

        // Garante que o usuário tem acesso à obra de recebimento (super_admin
        // acessa todas; demais só as suas). Bloqueio server-side.
        abort_unless(ObraContext::userCanAccess((int) $data['obra_id']), 403,
            'Você não tem acesso a esta obra.');

        $header = [
            'company_id'       => $companyId,
            'obra_id'          => $data['obra_id'],
            'data_movimento'   => $data['data_movimento'],
            'fornecedor_id'    => $data['fornecedor_id'] ?? null,
            'nota_fiscal'      => $data['nota_fiscal'] ?? null,
            'data_nota_fiscal' => $data['data_nota_fiscal'] ?? null,
        ];

        $movs = DB::transaction(function () use ($data, $header) {
            $criadas = [];
            foreach ($data['itens'] as $item) {
                $criadas[] = $this->lancarItem($item, $header);
            }
            return $criadas;
        });

        return redirect()->route('admin.estoque.entradas.index')
            ->with('success', sprintf(
                'Recebimento registrado: %d %s lançado%s. Saldos atualizados.',
                count($movs),
                count($movs) === 1 ? 'item' : 'itens',
                count($movs) === 1 ? '' : 's',
            ))
            ->with('comprovante_lote_ids', collect($movs)->pluck('id')->implode(','));
    }

    /**
     * Lança um item do recebimento: cura o produto/catálogo, cria a variante
     * (quando há cor/tamanho), a movimentação ENTRADA e, se EPI, o lote.
     * Deve ser chamado dentro de uma transação.
     */
    private function lancarItem(array $item, array $header): Movimentacao
    {
        $produto    = Produto::findOrFail($item['produto_id']);
        $valorUnit  = (float) ($item['valor_unitario'] ?? 0);
        $valorTotal = (float) $item['quantidade'] * $valorUnit;

        $tipoItem  = $item['tipo_item'] ?? $produto->tipo_item ?? Produto::TIPO_MATERIAL;
        $ehEpi     = in_array($tipoItem, Produto::TIPOS_COM_LOTE, true);
        $cor       = filled($item['cor'] ?? null)     ? trim($item['cor'])     : null;
        $tamanho   = filled($item['tamanho'] ?? null) ? trim($item['tamanho']) : null;
        $temCorTam = $cor !== null || $tamanho !== null;

        // "Cura" o produto: classificação + flag de variação.
        $atualizaProduto = [];
        if ($tipoItem !== $produto->tipo_item)                        $atualizaProduto['tipo_item'] = $tipoItem;
        if (($ehEpi || $temCorTam) && !$produto->controla_variacao)   $atualizaProduto['controla_variacao'] = true;
        if ($atualizaProduto) $produto->forceFill($atualizaProduto)->save();

        // Variante concreta (cor × tamanho) sob demanda + cura do catálogo.
        $varianteId = null;
        if ($temCorTam || $ehEpi) {
            $variante   = ProdutoVariante::firstOrCreatePara($produto->id, $cor, $tamanho);
            $varianteId = $variante->id;
            $this->registrarNoCatalogo($produto->id, $cor, $tamanho);
        }

        $mov = Movimentacao::create([
            'company_id'       => $header['company_id'],
            'tipo'             => Movimentacao::TIPO_ENTRADA,
            'produto_id'       => $produto->id,
            'variante_id'      => $varianteId,
            'obra_id'          => $header['obra_id'],
            'quantidade'       => $item['quantidade'],
            'valor_unitario'   => $valorUnit,
            'valor_total'      => $valorTotal,
            'data_movimento'   => $header['data_movimento'],
            'observacao'       => $item['observacao'] ?? null,
            'fornecedor_id'    => $header['fornecedor_id'],
            'nota_fiscal'      => $header['nota_fiscal'],
            'data_nota_fiscal' => $header['data_nota_fiscal'],
            'user_create'      => Auth::user()->email,
        ]);

        if ($ehEpi) {
            $lote = Lote::create([
                'company_id'              => $header['company_id'],
                'produto_id'              => $produto->id,
                'variante_id'             => $varianteId,
                'obra_id'                 => $header['obra_id'],
                'numero_ca'               => $item['numero_ca']   ?? null,
                'numero_lote'             => $item['numero_lote'] ?? null,
                'validade'                => $item['validade']    ?? null,
                'especificacao_tecnica'   => $item['especificacao_tecnica'] ?? null,
                'fornecedor_id'           => $header['fornecedor_id'],
                'valor_unitario'          => $valorUnit,
                'quantidade_inicial'      => $item['quantidade'],
                'quantidade_atual'        => $item['quantidade'],
                'data_entrada'            => $header['data_movimento'],
                'movimentacao_entrada_id' => $mov->id,
            ]);
            $mov->lote_id = $lote->id;
            $mov->saveQuietly(); // lote_id não afeta saldo → não re-dispara observer
        }

        if ($valorUnit > 0) {
            Produto::where('id', $produto->id)->update(['valor_ultima_entrada' => $valorUnit]);
        }

        return $mov;
    }

    /**
     * Registra cor/tamanho no catálogo de variações do produto
     * (estoque_produto_variacoes), se ainda não existirem. Assim os selects
     * das próximas entradas já trazem as opções.
     */
    private function registrarNoCatalogo(int $produtoId, ?string $cor, ?string $tamanho): void
    {
        if ($cor !== null && $cor !== '') {
            ProdutoVariacao::firstOrCreate(
                ['produto_id' => $produtoId, 'tipo' => ProdutoVariacao::TIPO_COR, 'valor' => $cor],
                ['ordem' => 0],
            );
        }
        if ($tamanho !== null && $tamanho !== '') {
            // Numérico (calçado) se só dígitos; senão vestuário (P/M/G…).
            $tipo = preg_match('/^\d+$/', $tamanho)
                ? ProdutoVariacao::TIPO_TAMANHO_NUMERICO
                : ProdutoVariacao::TIPO_TAMANHO_VESTUARIO;
            ProdutoVariacao::firstOrCreate(
                ['produto_id' => $produtoId, 'tipo' => $tipo, 'valor' => $tamanho],
                ['ordem' => 0],
            );
        }
    }
}
