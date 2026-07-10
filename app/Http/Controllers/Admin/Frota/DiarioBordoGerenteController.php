<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoDiarioBordo;
use App\Models\Obra;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Painel do gerente para o Diário de Bordo (read-only). O motorista preenche
 * em campo pelo PWA; aqui o gerente vê, no dia, duas listas — quem já
 * preencheu (Realizados) e quem não (Pendentes) — com o histórico dos últimos
 * 7 dias corridos por veículo. Semelhante ao painel do checklist semanal.
 *
 * Por padrão mostra TODA a frota da empresa (o gerente acompanha tudo). Há um
 * filtro OPCIONAL de obra (GET obra_id): a obra ativa do veículo é a locação
 * corrente — veiculos_locacaos.data_fim IS NULL, id_obraDestino = obra.
 *
 * "Realizado no dia X" = existe um diário do veículo com data_cadastro em X.
 */
class DiarioBordoGerenteController extends Controller
{
    private const DIAS_HISTORICO = 7; // dias da semana (últimos 7 dias corridos, terminando hoje)

    public function index(Request $request): InertiaResponse
    {
        $termo = trim((string) $request->input('q', ''));
        $hoje  = now()->startOfDay();

        // 5 dias corridos: [hoje-4 ... hoje] (mais antigo → hoje)
        $dias    = collect(range(self::DIAS_HISTORICO - 1, 0))->map(fn ($i) => $hoje->copy()->subDays($i)->toDateString());
        $inicio  = $dias->first();
        $hojeStr = $hoje->toDateString();

        // Frota ativa (o gerente acompanha os veículos em operação). Por padrão,
        // TODA a frota da empresa — sem escopo por obra da sessão.
        $veiculosQ = Veiculo::query()->where('situacao', 'Ativo')->orderBy('prefixo');

        // Filtro OPCIONAL de obra (GET): só veículos com locação ATIVA nessa obra
        // (data_fim IS NULL, id_obraDestino = obra).
        $obraId = (int) $request->input('obra_id') ?: null;
        if ($obraId) {
            $veiculosQ->whereHas('locacoes', function ($q) use ($obraId) {
                $q->whereNull('data_fim')->where('id_obraDestino', $obraId);
            });
        }

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

        // Diários no período: por veículo+dia guardamos o status do ciclo
        // (aberto | encerrado) e, por veículo, quem cadastrou o mais recente.
        $porDia  = []; // [id_veiculo][Y-m-d] = 'aberto' | 'encerrado'
        $cadastroPor = []; // [id_veiculo] = nome/e-mail do lançamento mais recente
        VeiculoDiarioBordo::whereNotNull('id_veiculo')
            ->whereDate('data_cadastro', '>=', $inicio)
            ->with('user:id,name')
            ->orderBy('id') // asc → o último iterado (maior id) é o mais recente
            ->get(['id', 'id_veiculo', 'data_cadastro', 'ciclo_status', 'id_user', 'user_create'])
            ->each(function ($d) use (&$porDia, &$cadastroPor) {
                $dia = optional($d->data_cadastro)->toDateString();
                if (! $dia) return;
                // ENCERRADO/FECHADO contam como "encerrado"; só ABERTO é aberto.
                $porDia[$d->id_veiculo][$dia] = strtoupper((string) $d->ciclo_status) === 'ABERTO' ? 'aberto' : 'encerrado';
                $cadastroPor[$d->id_veiculo] = optional($d->user)->name ?: ($d->user_create ?: '—');
            });

        $linhas = $veiculos->map(fn ($v) => [
            'id'             => $v->id,
            'prefixo'        => $v->prefixo,
            'veiculo'        => $v->veiculo ?: (trim("{$v->marca} {$v->modelo}") ?: '—'),
            'placa_chassi'   => $v->placa ?: ($v->nun_serie_chassi ?: '—'),
            'dias'           => $dias->map(fn ($ds) => $porDia[$v->id][$ds] ?? null)->all(),
            'cadastrado_por' => $cadastroPor[$v->id] ?? null,
            'realizado_hoje' => isset($porDia[$v->id][$hojeStr]),
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
            'filtros'    => ['q' => $termo, 'obra_id' => $obraId],
            'obras'      => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
            'agora'      => now()->format('d/m/Y H:i:s'),
        ]);
    }
}
