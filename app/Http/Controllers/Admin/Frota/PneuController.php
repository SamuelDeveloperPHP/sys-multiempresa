<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Pneu;
use App\Models\Frota\PneuInspecao;
use App\Models\Frota\PneuMovimentacao;
use App\Services\Frota\CalculadorCpkPneu;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Catalogo de pneus (ativo individual por numero de fogo) + ficha com ledger,
 * inspecoes e CPK. Montagem/rodizio/desmontagem sao feitos na aba do veiculo
 * (VeiculoController); aqui ficam recapagem/conserto/sucateamento/inspecao.
 */
class PneuController extends Controller
{
    public function index(Request $request, CalculadorCpkPneu $cpk): InertiaResponse
    {
        $query = Pneu::query();
        if ($s = $request->input('situacao')) $query->where('situacao', $s);
        if ($q = $request->string('q')->trim()->value()) {
            $query->where(fn ($w) => $w->where('numero_fogo', 'like', "%{$q}%")
                ->orWhere('marca', 'like', "%{$q}%")->orWhere('medida', 'like', "%{$q}%"));
        }

        $pagina = $query->orderBy('numero_fogo')->paginate(20)->withQueryString();

        // Posicao atual (ultima montagem/rodizio ativa) + CPK por linha da pagina.
        $pagina->getCollection()->transform(function (Pneu $p) use ($cpk) {
            $mov = $p->movimentacoes()->whereIn('tipo', ['montagem', 'rodizio'])
                ->orderByDesc('data')->orderByDesc('id')->with('veiculo:id,prefixo')->first();
            $c = $cpk->calcular($p);
            return [
                'id'            => $p->id,
                'numero_fogo'   => $p->numero_fogo,
                'marca'         => $p->marca,
                'medida'        => $p->medida,
                'desenho'       => $p->desenho,
                'vida_atual'    => $p->vida_atual,
                'situacao'      => $p->situacao,
                'veiculo'       => $p->situacao === 'montado' ? optional($mov?->veiculo)->prefixo : null,
                'posicao'       => $p->situacao === 'montado' ? $mov?->posicao : null,
                'rodado'        => $c['rodado'],
                'unidade'       => $c['unidade'],
                'cpk'           => $c['cpk'],
                'cpk_label'     => $c['cpk_label'],
                'custo_total'   => $c['custo_total'],
            ];
        });

        return Inertia::render('Admin/Frota/Pneus/Index', [
            'pneus'   => $pagina,
            'filtros' => $request->only(['situacao', 'q']),
            'resumo'  => [
                'total'     => Pneu::count(),
                'montados'  => Pneu::where('situacao', 'montado')->count(),
                'estoque'   => Pneu::where('situacao', 'estoque')->count(),
                'sucata'    => Pneu::where('situacao', 'sucata')->count(),
            ],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Pneus/Form', ['pneu' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validar($request);
        $data['situacao']    = 'estoque';
        $data['user_create'] = Auth::user()?->email;
        Pneu::create($data);
        return redirect()->route('admin.frota.pneus.index')->with('success', 'Pneu cadastrado.');
    }

    public function show(Pneu $pneu, CalculadorCpkPneu $cpk): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Pneus/Show', [
            'pneu'          => $pneu,
            'cpk'           => $cpk->calcular($pneu),
            'movimentacoes' => $pneu->movimentacoes()->with('veiculo:id,prefixo')
                ->orderByDesc('data')->orderByDesc('id')->get(),
            'inspecoes'     => $pneu->inspecoes()->with('veiculo:id,prefixo')
                ->orderByDesc('data')->orderByDesc('id')->get(),
        ]);
    }

    public function edit(Pneu $pneu): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Pneus/Form', ['pneu' => $pneu]);
    }

    public function update(Request $request, Pneu $pneu): RedirectResponse
    {
        $data = $this->validar($request);
        $data['user_edit'] = Auth::user()?->email;
        $pneu->update($data);
        return redirect()->route('admin.frota.pneus.index')->with('success', 'Pneu atualizado.');
    }

    public function destroy(Pneu $pneu): RedirectResponse
    {
        $pneu->delete();
        return redirect()->route('admin.frota.pneus.index')->with('success', 'Pneu removido.');
    }

    /** Recapagem: registra custo, incrementa a vida e devolve o pneu ao estoque. */
    public function recapar(Request $request, Pneu $pneu): RedirectResponse
    {
        $data = $request->validate([
            'data'          => 'required|date',
            'valor'         => 'nullable|numeric|min:0',
            'fornecedor_id' => 'nullable|integer',
            'observacao'    => 'nullable|string',
        ]);
        if ($pneu->situacao === 'sucata')  return back()->with('error', 'Pneu sucateado não pode ser recapado.');
        if ($pneu->situacao === 'montado') return back()->with('error', 'Desmonte o pneu do veículo antes de recapar (senão o rodado do período montado é perdido no CPK).');

        $novaVida = $pneu->vida_atual + 1;
        PneuMovimentacao::create([
            'pneu_id'         => $pneu->id,
            'tipo'            => 'recapagem',
            'data'            => $data['data'],
            'valor'           => $data['valor'] ?? null,
            'fornecedor_id'   => $data['fornecedor_id'] ?? null,
            'vida_resultante' => $novaVida,
            'observacao'      => $data['observacao'] ?? null,
            'user_create'     => Auth::user()?->email,
        ]);
        $pneu->update(['vida_atual' => $novaVida, 'situacao' => 'estoque', 'user_edit' => Auth::user()?->email]);
        return back()->with('success', "Recapagem registrada (agora {$novaVida}ª vida).");
    }

    /** Conserto: registra custo; mantém a situação. */
    public function consertar(Request $request, Pneu $pneu): RedirectResponse
    {
        $data = $request->validate([
            'data'          => 'required|date',
            'valor'         => 'nullable|numeric|min:0',
            'fornecedor_id' => 'nullable|integer',
            'observacao'    => 'nullable|string',
        ]);
        PneuMovimentacao::create([
            'pneu_id'       => $pneu->id,
            'tipo'          => 'conserto',
            'data'          => $data['data'],
            'valor'         => $data['valor'] ?? null,
            'fornecedor_id' => $data['fornecedor_id'] ?? null,
            'observacao'    => $data['observacao'] ?? null,
            'user_create'   => Auth::user()?->email,
        ]);
        return back()->with('success', 'Conserto registrado.');
    }

    /** Sucateamento: fim de vida da carcaça. */
    public function sucatear(Request $request, Pneu $pneu): RedirectResponse
    {
        $data = $request->validate([
            'data'       => 'required|date',
            'observacao' => 'nullable|string',
        ]);
        if ($pneu->situacao === 'sucata')  return back()->with('error', 'Pneu já está sucateado.');
        if ($pneu->situacao === 'montado') return back()->with('error', 'Desmonte o pneu do veículo antes de sucatear (senão o rodado do período montado é perdido no CPK).');

        PneuMovimentacao::create([
            'pneu_id'     => $pneu->id,
            'tipo'        => 'sucateamento',
            'data'        => $data['data'],
            'observacao'  => $data['observacao'] ?? null,
            'user_create' => Auth::user()?->email,
        ]);
        $pneu->update(['situacao' => 'sucata', 'user_edit' => Auth::user()?->email]);
        return back()->with('success', 'Pneu sucateado.');
    }

    /** Inspeção: mede sulco/pressão. */
    public function inspecionar(Request $request, Pneu $pneu): RedirectResponse
    {
        $data = $request->validate([
            'data'        => 'required|date',
            'sulco_mm'    => 'nullable|numeric|min:0|max:100',
            'pressao_psi' => 'nullable|numeric|min:0|max:300',
            'medicao'     => 'nullable|integer|min:0',
            'observacao'  => 'nullable|string',
        ]);
        PneuInspecao::create($data + [
            'pneu_id'     => $pneu->id,
            'user_create' => Auth::user()?->email,
        ]);
        return back()->with('success', 'Inspeção registrada.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'numero_fogo'   => 'required|string|max:60',
            'dot'           => 'nullable|string|max:20',
            'marca'         => 'nullable|string|max:80',
            'modelo'        => 'nullable|string|max:80',
            'medida'        => 'nullable|string|max:40',
            'desenho'       => 'nullable|string|max:40',
            'tipo'          => 'nullable|string|max:20',
            'vida_atual'    => 'nullable|integer|min:0|max:20',
            'valor_compra'  => 'nullable|numeric|min:0',
            'data_compra'   => 'nullable|date',
            'nota_fiscal'   => 'nullable|string|max:60',
            'fornecedor_id' => 'nullable|integer',
            'sulco_novo_mm' => 'nullable|numeric|min:0|max:100',
        ]);
    }
}
