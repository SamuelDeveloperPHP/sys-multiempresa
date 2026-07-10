<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoDiarioBordo;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Diario de bordo eh CRIADO pelo mobile. No admin, o gerente acompanha via
 * PAINEL (index): duas listas do dia (Realizados / Pendentes) por veiculo, com
 * o historico dos ultimos 7 dias (ciclo Aberto/Encerrado) e quem cadastrou.
 * Mostra TODA a frota ativa por padrao; obra e um filtro opcional (GET) pela
 * locacao ativa (data_fim NULL, id_obraDestino). show/update/destroy operam um
 * lancamento individual.
 */
class VeiculoDiarioBordoController extends Controller
{
    private const DIAS_HISTORICO = 7;

    public function index(Request $request): InertiaResponse
    {
        $termo = trim((string) $request->input('q', ''));
        $hoje  = now()->startOfDay();

        // Últimos 7 dias corridos [hoje-6 ... hoje]
        $dias    = collect(range(self::DIAS_HISTORICO - 1, 0))->map(fn ($i) => $hoje->copy()->subDays($i)->toDateString());
        $inicio  = $dias->first();
        $hojeStr = $hoje->toDateString();

        // Toda a frota ativa por padrão (o gerente vê tudo)
        $veiculosQ = Veiculo::query()->where('situacao', 'Ativo')->orderBy('prefixo');

        // Filtro OPCIONAL de obra (GET): veículos com locação ATIVA na obra
        // (data_fim IS NULL, id_obraDestino = obra).
        $obraId = (int) $request->input('obra_id') ?: null;
        if ($obraId) {
            $veiculosQ->whereHas('locacoes', function ($q) use ($obraId) {
                $q->whereNull('data_fim')->where('id_obraDestino', $obraId);
            });
        }
        // Filtro OPCIONAL de ciclo (GET): só veículos cujo diário MAIS RECENTE
        // do dia está nesse status. Aplicado depois (em memória) — ver abaixo.
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

        // Diários no período: por veículo+dia guardamos o ciclo (aberto|encerrado)
        // e, por veículo, o operador do lançamento mais recente.
        $porDia = []; $operadorPor = [];
        VeiculoDiarioBordo::whereNotNull('id_veiculo')
            ->whereDate('data_cadastro', '>=', $inicio)
            ->with('user:id,name')
            ->orderBy('id') // asc → último iterado = mais recente
            ->get(['id', 'id_veiculo', 'data_cadastro', 'ciclo_status', 'id_user', 'user_create'])
            ->each(function ($d) use (&$porDia, &$operadorPor) {
                $dia = optional($d->data_cadastro)->toDateString();
                if (! $dia) return;
                $porDia[$d->id_veiculo][$dia] = strtoupper((string) $d->ciclo_status) === 'ABERTO' ? 'aberto' : 'encerrado';
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

        // Filtro de ciclo (opcional): pelo status de HOJE
        if ($filtroCiclo === 'ABERTO' || $filtroCiclo === 'ENCERRADO') {
            $alvo = $filtroCiclo === 'ABERTO' ? 'aberto' : 'encerrado';
            $linhas = $linhas->filter(fn ($l) => $l['ciclo_hoje'] === $alvo)->values();
        }

        $realizados = $linhas->filter(fn ($l) => $l['ciclo_hoje'] !== null)->values();
        $pendentes  = $linhas->reject(fn ($l) => $l['ciclo_hoje'] !== null)->values();
        $total      = $linhas->count();
        $nReal      = $realizados->count();

        return Inertia::render('Admin/Frota/Diario/Index', [
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

    public function show(VeiculoDiarioBordo $diario): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Diario/Show', [
            'diario' => $diario->load(['veiculo:id,prefixo,placa', 'obra:id,nome_fantasia', 'user:id,name,email']),
        ]);
    }

    public function update(Request $request, VeiculoDiarioBordo $diario): RedirectResponse
    {
        $data = $request->validate([
            'descricao_atividade'    => 'nullable|string',
            'descricao_encerramento' => 'nullable|string',
            'ciclo_status'           => 'nullable|in:ABERTO,ENCERRADO',
        ]);
        $diario->update($data);
        return redirect()->route('admin.frota.diario.show', $diario->id)->with('success', 'Diário atualizado.');
    }

    public function destroy(VeiculoDiarioBordo $diario): RedirectResponse
    {
        $diario->delete();
        return redirect()->route('admin.frota.diario.index')->with('success', 'Diário removido.');
    }
}
