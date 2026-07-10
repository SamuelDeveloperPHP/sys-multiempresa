<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoChecklistRealizado;
use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Obra;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * PAINEL do gerente para os checklists PREENCHIDOS em campo (execuções do
 * mobile). Mesmo formato do diário de bordo: duas listas do dia (Realizados /
 * Pendentes) por veículo, histórico de 7 dias (ciclo Aberto/Encerrado) e quem
 * cadastrou. NÃO confundir com o catálogo de checklists (VeiculoChecklist),
 * que é onde se cadastram os itens que o app baixa.
 *
 * Toda a frota ativa por padrão; obra é filtro opcional (GET) pela locação
 * ativa (data_fim NULL, id_obraDestino). show/destroy operam uma execução.
 */
class VeiculoChecklistServicoController extends Controller
{
    private const DIAS_HISTORICO = 7;

    public function index(Request $request): InertiaResponse
    {
        $termo = trim((string) $request->input('q', ''));
        $hoje  = now()->startOfDay();

        $dias    = collect(range(self::DIAS_HISTORICO - 1, 0))->map(fn ($i) => $hoje->copy()->subDays($i)->toDateString());
        $inicio  = $dias->first();
        $hojeStr = $hoje->toDateString();

        // Toda a frota ativa por padrão (o gerente vê tudo)
        $veiculosQ = Veiculo::query()->where('situacao', 'Ativo')->orderBy('prefixo');

        // Filtro OPCIONAL de obra (GET): veículos com locação ATIVA na obra
        $obraId = (int) $request->input('obra_id') ?: null;
        if ($obraId) {
            $veiculosQ->whereHas('locacoes', function ($q) use ($obraId) {
                $q->whereNull('data_fim')->where('id_obraDestino', $obraId);
            });
        }
        $filtroCiclo = strtoupper((string) $request->input('ciclo_status', ''));

        if ($termo !== '') {
            $like = '%' . $termo . '%';
            $veiculosQ->where(function ($q) use ($like) {
                $q->where('prefixo', 'like', $like)->orWhere('placa', 'like', $like)
                    ->orWhere('modelo', 'like', $like)->orWhere('marca', 'like', $like)
                    ->orWhere('veiculo', 'like', $like)->orWhere('nun_serie_chassi', 'like', $like);
            });
        }
        $veiculos = $veiculosQ->get(['id', 'prefixo', 'placa', 'marca', 'modelo', 'veiculo', 'nun_serie_chassi']);

        // Execuções no período: por veículo+dia guardamos o ciclo (aberto|encerrado)
        // e, por veículo, o operador do lançamento mais recente.
        $porDia = []; $operadorPor = [];
        VeiculoChecklistServico::whereNotNull('id_veiculo')
            ->whereDate('data_cadastro', '>=', $inicio)
            ->with('user:id,name')
            ->orderBy('id')
            ->get(['id', 'id_veiculo', 'data_cadastro', 'status_ciclo', 'id_user', 'user_create'])
            ->each(function ($d) use (&$porDia, &$operadorPor) {
                $dia = optional($d->data_cadastro)->toDateString();
                if (! $dia) return;
                $porDia[$d->id_veiculo][$dia] = strtoupper((string) $d->status_ciclo) === 'ABERTO' ? 'aberto' : 'encerrado';
                $operadorPor[$d->id_veiculo] = optional($d->user)->name ?: ($d->user_create ?: '—');
            });

        $linhas = $veiculos->map(fn ($v) => [
            'id'             => $v->id,
            'prefixo'        => $v->prefixo,
            'veiculo'        => $v->veiculo ?: (trim("{$v->marca} {$v->modelo}") ?: '—'),
            'placa_chassi'   => $v->placa ?: ($v->nun_serie_chassi ?: '—'),
            'dias'           => $dias->map(fn ($ds) => $porDia[$v->id][$ds] ?? null)->all(),
            'cadastrado_por' => $operadorPor[$v->id] ?? null,
            'ciclo_hoje'     => $porDia[$v->id][$hojeStr] ?? null,
        ]);

        if ($filtroCiclo === 'ABERTO' || $filtroCiclo === 'ENCERRADO') {
            $alvo = $filtroCiclo === 'ABERTO' ? 'aberto' : 'encerrado';
            $linhas = $linhas->filter(fn ($l) => $l['ciclo_hoje'] === $alvo)->values();
        }

        $realizados = $linhas->filter(fn ($l) => $l['ciclo_hoje'] !== null)->values();
        $pendentes  = $linhas->reject(fn ($l) => $l['ciclo_hoje'] !== null)->values();
        $total      = $linhas->count();
        $nReal      = $realizados->count();

        return Inertia::render('Admin/Frota/ChecklistExecucoes/Index', [
            'dias'       => $dias->all(),
            'realizados' => $realizados,
            'pendentes'  => $pendentes,
            'kpis'       => [
                'total'           => $total,
                'realizados_hoje' => $nReal,
                'pendentes_hoje'  => $total - $nReal,
                'cumprimento'     => $total > 0 ? round($nReal / $total * 100, 1) : 0.0,
            ],
            'obras'   => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
            'filtros' => ['q' => $termo, 'obra_id' => $obraId, 'ciclo_status' => $filtroCiclo ?: null],
            'agora'   => now()->format('d/m/Y H:i:s'),
        ]);
    }

    public function show(VeiculoChecklistServico $execucao): InertiaResponse
    {
        $itens = VeiculoChecklistRealizado::where('id_checklist_realizado', $execucao->id_local)
            ->with('item:id,nome_servico')
            ->orderBy('id')
            ->get();

        return Inertia::render('Admin/Frota/ChecklistExecucoes/Show', [
            'execucao' => $execucao->load(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'checklist:id,nome_checklist']),
            'itens'    => $itens,
        ]);
    }

    public function destroy(VeiculoChecklistServico $execucao): \Illuminate\Http\RedirectResponse
    {
        $execucao->delete();
        return redirect()->route('admin.frota.checklist-execucoes.index')->with('success', 'Execução removida.');
    }
}
