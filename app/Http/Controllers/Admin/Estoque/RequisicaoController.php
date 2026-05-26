<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Estoque\RequisicaoRequest;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\Requisicao;
use App\Models\Estoque\RequisicaoItem;
use App\Models\Estoque\Saldo;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Requisições de estoque com fluxo de aprovação.
 *
 * Fluxo:
 *   RASCUNHO → ENVIADA → APROVADA → ATENDIDA
 *                     ↘ REJEITADA
 *           ↘ CANCELADA
 *
 * Métodos de transição (cada um em endpoint dedicado):
 *   enviar()    : RASCUNHO → ENVIADA (solicitante)
 *   aprovar()   : ENVIADA  → APROVADA (aprovador)
 *   rejeitar()  : ENVIADA  → REJEITADA (aprovador, com motivo)
 *   atender()   : APROVADA → ATENDIDA (almoxarife, gera movs de SAÍDA)
 *   cancelar()  : RASCUNHO|ENVIADA → CANCELADA (solicitante)
 *
 * Permissão para cada ação:
 *   - Solicitante (qualquer): criar, editar rascunho, enviar, cancelar
 *   - Aprovador (can_edit no módulo): aprovar, rejeitar
 *   - Almoxarife (can_edit no módulo): atender
 *
 * Todas as transições + atendimento são em DB::transaction para garantir
 * atomicidade. O atendimento gera Movimentacao tipo=SAIDA por item — o
 * Observer cuida de atualizar os saldos.
 */
class RequisicaoController extends Controller
{
    // -----------------------------------------------------------------------
    // INDEX / SHOW
    // -----------------------------------------------------------------------

    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        $userId    = $request->user()->id;

        $query = Requisicao::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->with([
                'obraOrigem:id,codigo_obra,nome_fantasia',
                'obraDestino:id,codigo_obra,nome_fantasia',
                'solicitante:id,name',
                'aprovador:id,name',
                'atendente:id,name',
            ])
            ->withCount('itens');

        // Filtros
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($obraId = $request->input('obra_id')) {
            $query->where('obra_origem_id', $obraId);
        }
        if ($request->boolean('apenas_minhas')) {
            $query->where('solicitante_id', $userId);
        }
        if ($q = $request->input('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('numero', 'like', "%{$q}%")
                  ->orWhere('observacao_solicitante', 'like', "%{$q}%");
            });
        }
        if ($de = $request->input('data_de')) {
            $query->whereDate('data_solicitacao', '>=', $de);
        }
        if ($ate = $request->input('data_ate')) {
            $query->whereDate('data_solicitacao', '<=', $ate);
        }

        $requisicoes = $query->orderByDesc('id')->simplePaginate(20)->withQueryString();

        // Contadores rápidos (badges nos botões de filtro)
        $contadoresQuery = Requisicao::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId));
        $contadores = (clone $contadoresQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return Inertia::render('Admin/Estoque/Requisicoes/Index', [
            'requisicoes' => $requisicoes,
            'obras'       => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'contadores'  => $contadores,
            'filtros'     => $request->only(['status', 'obra_id', 'apenas_minhas', 'q', 'data_de', 'data_ate']),
        ]);
    }

    public function show(Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);

        $requisicao->load([
            'obraOrigem:id,codigo_obra,nome_fantasia',
            'obraDestino:id,codigo_obra,nome_fantasia',
            'solicitante:id,name,email',
            'aprovador:id,name,email',
            'atendente:id,name,email',
            'itens.produto:id,sku,nome,unidade,valor_unitario,imagem',
        ]);

        // Para cada item, busca o saldo na obra origem (para mostrar disponibilidade)
        $saldosObra = Saldo::where('obra_id', $requisicao->obra_origem_id)
            ->whereIn('produto_id', $requisicao->itens->pluck('produto_id'))
            ->pluck('quantidade', 'produto_id')
            ->map(fn ($q) => (float) $q)
            ->all();

        return Inertia::render('Admin/Estoque/Requisicoes/Show', [
            'requisicao' => $requisicao,
            'saldos'     => $saldosObra,
        ]);
    }

    // -----------------------------------------------------------------------
    // CREATE / EDIT — só permitido em status RASCUNHO
    // -----------------------------------------------------------------------

    public function create()
    {
        $companyId = CompanyContext::current()?->id;
        return Inertia::render('Admin/Estoque/Requisicoes/Form', [
            'requisicao' => null,
            'obras'      => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                              ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
        ]);
    }

    public function edit(Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_RASCUNHO, 'Só é possível editar requisições em rascunho.');

        $requisicao->load(['itens.produto:id,sku,nome,unidade,valor_unitario,imagem']);
        $companyId = CompanyContext::current()?->id;

        return Inertia::render('Admin/Estoque/Requisicoes/Form', [
            'requisicao' => $requisicao,
            'obras'      => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                              ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
        ]);
    }

    public function store(RequisicaoRequest $request)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de criar requisição.');

        $requisicao = DB::transaction(function () use ($request, $companyId) {
            $r = Requisicao::create([
                'company_id'             => $companyId,
                'numero'                 => Requisicao::gerarNumero($companyId),
                'obra_origem_id'         => $request->input('obra_origem_id'),
                'obra_destino_id'        => $request->input('obra_destino_id') ?: null,
                'solicitante_id'         => $request->user()->id,
                'status'                 => Requisicao::STATUS_RASCUNHO,
                'data_solicitacao'       => $request->input('data_solicitacao'),
                'observacao_solicitante' => $request->input('observacao_solicitante'),
            ]);

            $this->sincronizarItens($r, $request->input('itens', []));
            $this->recalcularValorTotal($r);

            return $r;
        });

        return redirect()->route('admin.estoque.requisicoes.show', $requisicao)
            ->with('success', 'Requisição ' . $requisicao->numero . ' criada como rascunho.');
    }

    public function update(RequisicaoRequest $request, Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_RASCUNHO, 'Só é possível editar requisições em rascunho.');

        DB::transaction(function () use ($request, $requisicao) {
            $requisicao->update([
                'obra_origem_id'         => $request->input('obra_origem_id'),
                'obra_destino_id'        => $request->input('obra_destino_id') ?: null,
                'data_solicitacao'       => $request->input('data_solicitacao'),
                'observacao_solicitante' => $request->input('observacao_solicitante'),
            ]);

            // Recria itens do zero (mais simples e seguro)
            $requisicao->itens()->delete();
            $this->sincronizarItens($requisicao, $request->input('itens', []));
            $this->recalcularValorTotal($requisicao);
        });

        return redirect()->route('admin.estoque.requisicoes.show', $requisicao)
            ->with('success', 'Requisição atualizada.');
    }

    public function destroy(Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_RASCUNHO, 'Só é possível excluir requisições em rascunho. Use "Cancelar" para outros status.');

        $requisicao->delete();
        return redirect()->route('admin.estoque.requisicoes.index')
            ->with('success', 'Rascunho excluído.');
    }

    // -----------------------------------------------------------------------
    // TRANSIÇÕES DE STATUS
    // -----------------------------------------------------------------------

    public function enviar(Request $request, Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_RASCUNHO, 'Só rascunhos podem ser enviados.');

        // Solicitante: dono ou qualquer um com permissão (deixa flexível em DEV)
        abort_unless(
            $requisicao->solicitante_id === $request->user()->id || $request->user()->type === 'super_admin',
            403,
            'Apenas o solicitante (ou super-admin) pode enviar.'
        );

        abort_if($requisicao->itens()->count() === 0, 422, 'Requisição sem itens não pode ser enviada.');

        $requisicao->update([
            'status'      => Requisicao::STATUS_ENVIADA,
            'data_envio'  => now(),
        ]);

        return back()->with('success', 'Requisição enviada para aprovação.');
    }

    public function aprovar(Request $request, Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_ENVIADA, 'Só requisições enviadas podem ser aprovadas.');

        $data = $request->validate([
            'observacao_aprovador' => ['nullable', 'string', 'max:1000'],
        ]);

        $requisicao->update([
            'status'               => Requisicao::STATUS_APROVADA,
            'aprovador_id'         => $request->user()->id,
            'data_aprovacao'       => now(),
            'observacao_aprovador' => $data['observacao_aprovador'] ?? null,
        ]);

        return back()->with('success', 'Requisição aprovada. Pronta para o almoxarife atender.');
    }

    public function rejeitar(Request $request, Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_ENVIADA, 'Só requisições enviadas podem ser rejeitadas.');

        $data = $request->validate([
            'motivo_rejeicao' => ['required', 'string', 'max:2000'],
        ]);

        $requisicao->update([
            'status'          => Requisicao::STATUS_REJEITADA,
            'aprovador_id'    => $request->user()->id,
            'data_aprovacao'  => now(),
            'motivo_rejeicao' => $data['motivo_rejeicao'],
        ]);

        return back()->with('success', 'Requisição rejeitada.');
    }

    public function cancelar(Request $request, Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        abort_unless(
            in_array($requisicao->status, [Requisicao::STATUS_RASCUNHO, Requisicao::STATUS_ENVIADA], true),
            422,
            'Só é possível cancelar requisições em rascunho ou aguardando aprovação.'
        );

        abort_unless(
            $requisicao->solicitante_id === $request->user()->id || $request->user()->type === 'super_admin',
            403,
            'Apenas o solicitante (ou super-admin) pode cancelar.'
        );

        $requisicao->update(['status' => Requisicao::STATUS_CANCELADA]);
        return back()->with('success', 'Requisição cancelada.');
    }

    /**
     * Atende a requisição: gera Movimentacao tipo=SAIDA por item, atualiza
     * quantidade_atendida e marca como ATENDIDA. Em transação.
     */
    public function atender(Request $request, Requisicao $requisicao)
    {
        $this->authorizeCompany($requisicao);
        $this->mustBeStatus($requisicao, Requisicao::STATUS_APROVADA, 'Só requisições aprovadas podem ser atendidas.');

        $data = $request->validate([
            'itens'                          => ['required', 'array'],
            'itens.*.item_id'                => ['required', 'integer', Rule::exists('estoque_requisicao_itens', 'id')],
            'itens.*.quantidade_atendida'    => ['required', 'numeric', 'min:0', 'max:999999.999'],
        ]);

        // Pré-validação de saldo em todos os itens antes de aplicar qualquer mov
        $itensInput = collect($data['itens'])->keyBy('item_id');
        $requisicaoItens = $requisicao->itens()->whereIn('id', $itensInput->keys())->get();

        foreach ($requisicaoItens as $item) {
            $qtdAtendida = (float) $itensInput[$item->id]['quantidade_atendida'];
            if ($qtdAtendida <= 0) continue;
            if ($qtdAtendida > (float) $item->quantidade_solicitada) {
                throw ValidationException::withMessages([
                    'itens' => ["Item {$item->produto_id}: atendimento ({$qtdAtendida}) excede o solicitado ({$item->quantidade_solicitada})."],
                ]);
            }
            $saldo = Saldo::where('produto_id', $item->produto_id)
                ->where('obra_id', $requisicao->obra_origem_id)
                ->value('quantidade') ?? 0;
            if ($qtdAtendida > (float) $saldo) {
                throw ValidationException::withMessages([
                    'itens' => ["Saldo insuficiente para produto #{$item->produto_id} (disponível: {$saldo}, atender: {$qtdAtendida})."],
                ]);
            }
        }

        DB::transaction(function () use ($requisicao, $requisicaoItens, $itensInput, $request) {
            foreach ($requisicaoItens as $item) {
                $qtdAtendida = (float) $itensInput[$item->id]['quantidade_atendida'];

                $item->update([
                    'quantidade_atendida' => $qtdAtendida,
                ]);

                if ($qtdAtendida > 0) {
                    // Gera movimentação SAIDA. Observer atualiza o saldo.
                    Movimentacao::create([
                        'company_id'         => $requisicao->company_id,
                        'produto_id'         => $item->produto_id,
                        'obra_id'            => $requisicao->obra_origem_id,
                        'tipo'               => Movimentacao::TIPO_SAIDA,
                        'quantidade'         => $qtdAtendida,
                        'valor_unitario'     => $item->valor_unitario_estimado ?? 0,
                        'valor_total'        => $qtdAtendida * (float) ($item->valor_unitario_estimado ?? 0),
                        'data_movimento'     => now()->toDateString(),
                        'observacao'         => 'Atendimento da requisição ' . $requisicao->numero,
                        'requisicao_id'      => $requisicao->id,
                        'requisicao_item_id' => $item->id,
                        'user_create'        => $request->user()->email,
                    ]);
                }
            }

            $requisicao->update([
                'status'             => Requisicao::STATUS_ATENDIDA,
                'atendente_id'       => $request->user()->id,
                'data_atendimento'   => now(),
            ]);
        });

        return redirect()->route('admin.estoque.requisicoes.show', $requisicao)
            ->with('success', 'Requisição atendida. Saldos atualizados automaticamente.');
    }

    // -----------------------------------------------------------------------
    // HELPERS
    // -----------------------------------------------------------------------

    protected function authorizeCompany(Requisicao $requisicao): void
    {
        $companyId = CompanyContext::current()?->id;
        abort_if($companyId && $requisicao->company_id !== $companyId, 403);
    }

    protected function mustBeStatus(Requisicao $r, string $status, string $msg): void
    {
        abort_if($r->status !== $status, 422, $msg);
    }

    protected function sincronizarItens(Requisicao $requisicao, array $itens): void
    {
        foreach ($itens as $itemData) {
            $valorUnit  = (float) ($itemData['valor_unitario_estimado'] ?? 0);
            $qtdSolicit = (float) $itemData['quantidade_solicitada'];

            RequisicaoItem::create([
                'requisicao_id'           => $requisicao->id,
                'produto_id'              => $itemData['produto_id'],
                'quantidade_solicitada'   => $qtdSolicit,
                'quantidade_atendida'     => 0,
                'valor_unitario_estimado' => $valorUnit,
                'valor_total_estimado'    => $qtdSolicit * $valorUnit,
                'observacao'              => $itemData['observacao'] ?? null,
            ]);
        }
    }

    protected function recalcularValorTotal(Requisicao $requisicao): void
    {
        $total = $requisicao->itens()->sum('valor_total_estimado');
        $requisicao->update(['valor_total_estimado' => $total]);
    }
}
