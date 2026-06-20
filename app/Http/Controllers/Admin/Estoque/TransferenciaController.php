<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Saldo;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Transferências entre obras — tela dedicada para TIPO_TRANSF_OUT/IN.
 *
 * O `store` cria DOIS registros em transação:
 *   - TRANSF_OUT na obra de origem (sai do saldo da origem)
 *   - TRANSF_IN  na obra de destino (entra no saldo do destino)
 *   - movimentacao_par_id mútuo entre os dois para auditoria.
 *
 * Não exige retirante (é operação interna do almoxarifado, sem entrega
 * a funcionário). A obra de destino DEVE ser diferente da origem.
 */
class TransferenciaController extends Controller
{
    public function index(Request $request)
    {
        $companyId = CompanyContext::current()?->id;

        // Lista somente as TRANSF_OUT (cada par OUT+IN é representado pelo OUT)
        $query = Movimentacao::query()
            ->where('tipo', Movimentacao::TIPO_TRANSF_OUT)
            ->with([
                'produto:id,sku,nome,unidade',
                'obra:id,codigo_obra,nome_fantasia',
                'obraContraparte:id,codigo_obra,nome_fantasia',
                'par:id,obra_id',
            ]);

        if ($companyId) $query->where('company_id', $companyId);
        if ($obraOrig    = $request->input('obra_id'))         $query->where('obra_id', $obraOrig);
        if ($obraDestino = $request->input('obra_destino_id')) $query->where('obra_contraparte_id', $obraDestino);
        if ($q = $request->input('q')) {
            $query->whereHas('produto', fn ($w) =>
                $w->where('nome', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"));
        }
        if ($de  = $request->input('data_de'))  $query->whereDate('data_movimento', '>=', $de);
        if ($ate = $request->input('data_ate')) $query->whereDate('data_movimento', '<=', $ate);

        $transferencias = $query->orderByDesc('id')->simplePaginate(25)->withQueryString();

        return Inertia::render('Admin/Estoque/Transferencias/Index', [
            'transferencias' => $transferencias,
            'obras'          => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                                    ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
            'filtros'        => $request->only(['obra_id', 'obra_destino_id', 'q', 'data_de', 'data_ate']),
        ]);
    }

    public function create()
    {
        $companyId = CompanyContext::current()?->id;
        return Inertia::render('Admin/Estoque/Transferencias/Form', [
            'obras' => Obra::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                          ->orderBy('codigo_obra')->get(['id', 'codigo_obra', 'nome_fantasia']),
        ]);
    }

    public function store(Request $request)
    {
        $companyId = CompanyContext::current()?->id;
        abort_if(!$companyId, 422, 'Selecione uma empresa antes de lançar transferência.');

        $data = $request->validate([
            'produto_id'      => ['required', 'integer', Rule::exists('estoque_produtos', 'id')->whereNull('deleted_at')],
            'obra_id'         => ['required', 'integer', Rule::exists('obras', 'id')],
            'obra_destino_id' => ['required', 'integer', 'different:obra_id', Rule::exists('obras', 'id')],
            'quantidade'      => ['required', 'numeric', 'gt:0', 'max:999999.999'],
            'valor_unitario'  => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'data_movimento'  => ['required', 'date', 'before_or_equal:today'],
            'observacao'      => ['nullable', 'string', 'max:1000'],
        ], [
            'obra_destino_id.different' => 'A obra de destino deve ser diferente da origem.',
        ]);

        // Saldo
        $saldo = Saldo::where('produto_id', $data['produto_id'])
            ->where('obra_id', $data['obra_id'])->value('quantidade') ?? 0;
        if ((float) $saldo < (float) $data['quantidade']) {
            throw ValidationException::withMessages([
                'quantidade' => sprintf('Saldo insuficiente na obra de origem. Disponível: %s.',
                    number_format((float) $saldo, 3, ',', '.')),
            ]);
        }

        $valorTotal = (float) $data['quantidade'] * (float) ($data['valor_unitario'] ?? 0);
        $userEmail  = Auth::user()->email;

        $out = DB::transaction(function () use ($data, $valorTotal, $companyId, $userEmail) {
            $out = Movimentacao::create([
                'company_id'          => $companyId,
                'produto_id'          => $data['produto_id'],
                'obra_id'             => $data['obra_id'],
                'tipo'                => Movimentacao::TIPO_TRANSF_OUT,
                'quantidade'          => $data['quantidade'],
                'valor_unitario'      => $data['valor_unitario'] ?? 0,
                'valor_total'         => $valorTotal,
                'data_movimento'      => $data['data_movimento'],
                'observacao'          => $data['observacao'] ?? null,
                'obra_contraparte_id' => $data['obra_destino_id'],
                'user_create'         => $userEmail,
            ]);

            $in = Movimentacao::create([
                'company_id'          => $companyId,
                'produto_id'          => $data['produto_id'],
                'obra_id'             => $data['obra_destino_id'],
                'tipo'                => Movimentacao::TIPO_TRANSF_IN,
                'quantidade'          => $data['quantidade'],
                'valor_unitario'      => $data['valor_unitario'] ?? 0,
                'valor_total'         => $valorTotal,
                'data_movimento'      => $data['data_movimento'],
                'observacao'          => $data['observacao'] ?? null,
                'obra_contraparte_id' => $data['obra_id'],
                'movimentacao_par_id' => $out->id,
                'user_create'         => $userEmail,
            ]);

            $out->update(['movimentacao_par_id' => $in->id]);
            return $out;
        });

        return redirect()
            ->route('admin.estoque.movimentacoes.show', $out)
            ->with('success', 'Transferência registrada (par OUT/IN criado).');
    }
}
