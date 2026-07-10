<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoDiarioBordo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Painel do gerente para o Diário de Bordo (read-only). O motorista preenche
 * em campo pelo PWA; aqui o gerente vê, no dia, duas listas — quem já
 * preencheu (Realizados) e quem não (Pendentes) — com o histórico dos últimos
 * 5 dias corridos por veículo. Semelhante ao painel do checklist semanal.
 *
 * "Realizado no dia X" = existe um diário do veículo com data_cadastro em X.
 */
class DiarioBordoGerenteController extends Controller
{
    private const DIAS_HISTORICO = 5;

    public function index(Request $request): InertiaResponse
    {
        $termo = trim((string) $request->input('q', ''));
        $hoje  = now()->startOfDay();

        // 5 dias corridos: [hoje-4 ... hoje] (mais antigo → hoje)
        $dias    = collect(range(self::DIAS_HISTORICO - 1, 0))->map(fn ($i) => $hoje->copy()->subDays($i)->toDateString());
        $inicio  = $dias->first();
        $hojeStr = $hoje->toDateString();

        // Frota ativa (o gerente acompanha os veículos em operação)
        $veiculosQ = Veiculo::query()->where('situacao', 'Ativo')->orderBy('prefixo');
        if ($termo !== '') {
            $like = '%' . $termo . '%';
            $veiculosQ->where(function ($q) use ($like) {
                $q->where('prefixo', 'like', $like)
                    ->orWhere('placa', 'like', $like)
                    ->orWhere('modelo', 'like', $like)
                    ->orWhere('marca', 'like', $like)
                    ->orWhere('veiculo', 'like', $like)
                    ->orWhere('nun_serie_chassi', 'like', $like);
            });
        }
        $veiculos = $veiculosQ->get(['id', 'prefixo', 'placa', 'marca', 'modelo', 'veiculo', 'nun_serie_chassi']);

        // Diários no período, marcados por veículo + dia
        $feitos = [];
        VeiculoDiarioBordo::whereNotNull('id_veiculo')
            ->whereDate('data_cadastro', '>=', $inicio)
            ->get(['id_veiculo', 'data_cadastro'])
            ->each(function ($d) use (&$feitos) {
                $dia = optional($d->data_cadastro)->toDateString();
                if ($dia) $feitos[$d->id_veiculo][$dia] = true;
            });

        $linhas = $veiculos->map(fn ($v) => [
            'id'           => $v->id,
            'prefixo'      => $v->prefixo,
            'veiculo'      => $v->veiculo ?: trim("{$v->marca} {$v->modelo}") ?: '—',
            'placa_chassi' => $v->placa ?: ($v->nun_serie_chassi ?: '—'),
            'dias'         => $dias->map(fn ($ds) => isset($feitos[$v->id][$ds]))->all(),
            'realizado_hoje' => isset($feitos[$v->id][$hojeStr]),
        ]);

        $realizados = $linhas->filter(fn ($l) => $l['realizado_hoje'])->values();
        $pendentes  = $linhas->reject(fn ($l) => $l['realizado_hoje'])->values();
        $total      = $linhas->count();
        $nReal      = $realizados->count();

        return Inertia::render('Admin/Frota/DiarioBordo/Index', [
            'dias'       => $dias->all(),
            'realizados' => $realizados,
            'pendentes'  => $pendentes,
            'kpis'       => [
                'total'           => $total,
                'realizados_hoje' => $nReal,
                'pendentes_hoje'  => $total - $nReal,
                'cumprimento'     => $total > 0 ? round($nReal / $total * 100, 1) : 0.0,
            ],
            'filtros' => ['q' => $termo],
            'agora'   => now()->format('d/m/Y H:i:s'),
        ]);
    }
}
