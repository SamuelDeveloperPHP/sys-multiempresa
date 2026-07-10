<?php

namespace App\Http\Controllers\Admin\Frota\Concerns;

use App\Models\Frota\Veiculo;
use Illuminate\Http\Request;

/**
 * Lógica compartilhada do painel de medidores (horímetro / hodômetro).
 * Ambas as telas têm a mesma estrutura — só mudam as colunas (hr x km) — então
 * o trait monta o resumo por veículo (última leitura + atraso) e a lista de
 * leituras INCONSISTENTES (nova < atual, ou salto absurdo) para limpeza.
 */
trait ResumoMedidor
{
    private const DIAS_ATRASO = 15; // sem leitura há mais de N dias = atrasado

    /**
     * @param  class-string  $model      Model do medidor (VeiculoHorimetro/VeiculoQuilometragem)
     * @param  string  $cAtual/$cNovo/$cData  nomes das colunas
     * @param  string  $unidade    'hr' | 'km'
     * @param  int     $saltoMax   salto (novo-atual) acima disso = inconsistente
     */
    protected function dadosPainelMedidor(Request $request, string $model, string $cAtual, string $cNovo, string $cData, string $unidade, int $saltoMax): array
    {
        $termo  = trim((string) $request->input('q', ''));
        $obraId = (int) $request->input('obra_id') ?: null;

        // Veículos considerados (filtro busca/obra). null = todos com leitura.
        $restringir = null;
        if ($termo !== '' || $obraId) {
            $vq = Veiculo::query();
            if ($obraId) {
                $vq->whereHas('locacoes', fn ($q) => $q->whereNull('data_fim')->where('id_obraDestino', $obraId));
            }
            if ($termo !== '') {
                $like = '%' . $termo . '%';
                $vq->where(function ($q) use ($like) {
                    $q->where('prefixo', 'like', $like)->orWhere('placa', 'like', $like)
                        ->orWhere('modelo', 'like', $like)->orWhere('marca', 'like', $like)
                        ->orWhere('veiculo', 'like', $like)->orWhere('nun_serie_chassi', 'like', $like);
                });
            }
            $restringir = $vq->pluck('id')->all();
        }

        $incRaw = "({$cNovo} < {$cAtual} OR ({$cNovo} - {$cAtual}) > {$saltoMax})";

        // Estatísticas por veículo: nº leituras, última data, inconsistências.
        $stats = $model::query()->whereNotNull('veiculo_id')
            ->when($restringir !== null, fn ($q) => $q->whereIn('veiculo_id', $restringir ?: [0]))
            ->selectRaw("veiculo_id, COUNT(*) n, MAX({$cData}) ultima_data, SUM(CASE WHEN {$incRaw} THEN 1 ELSE 0 END) inconsist")
            ->groupBy('veiculo_id')->get()->keyBy('veiculo_id');

        // Última leitura (valor) por veículo — linha de maior id.
        $maxIds = $model::query()->whereNotNull('veiculo_id')
            ->when($restringir !== null, fn ($q) => $q->whereIn('veiculo_id', $restringir ?: [0]))
            ->selectRaw('MAX(id) id')->groupBy('veiculo_id')->pluck('id');
        $ultimas = $model::whereIn('id', $maxIds)->get(['veiculo_id', $cNovo, 'user_create'])->keyBy('veiculo_id');

        $infos = Veiculo::whereIn('id', $stats->keys()->all() ?: [0])
            ->get(['id', 'prefixo', 'placa', 'marca', 'modelo', 'veiculo', 'nun_serie_chassi'])->keyBy('id');

        $hoje = now()->startOfDay();
        $veiculos = $stats->map(function ($s, $id) use ($infos, $ultimas, $cNovo, $hoje) {
            $inf  = $infos->get($id);
            $data = $s->ultima_data ? \Illuminate\Support\Carbon::parse($s->ultima_data) : null;
            $dias = $data ? (int) $data->startOfDay()->diffInDays($hoje) : null;
            return [
                'id'            => (int) $id,
                'prefixo'       => $inf?->prefixo ?? '—',
                'veiculo'       => $inf?->veiculo ?: (trim(($inf?->marca ?? '') . ' ' . ($inf?->modelo ?? '')) ?: '—'),
                'placa_chassi'  => $inf?->placa ?: ($inf?->nun_serie_chassi ?: '—'),
                'ultima'        => (float) ($ultimas->get($id)?->{$cNovo} ?? 0),
                'ultima_data'   => optional($data)->toDateString(),
                'dias_atraso'   => $dias,
                'atrasado'      => $dias !== null && $dias > self::DIAS_ATRASO,
                'leituras'      => (int) $s->n,
                'inconsistencias' => (int) $s->inconsist,
                'operador'      => $ultimas->get($id)?->user_create ?? '—',
            ];
        })->sortBy('prefixo')->values();

        // Lista das leituras inconsistentes (para excluir).
        $inconsistencias = $model::query()->whereNotNull('veiculo_id')
            ->with('veiculo:id,prefixo,placa')
            ->when($restringir !== null, fn ($q) => $q->whereIn('veiculo_id', $restringir ?: [0]))
            ->whereRaw($incRaw)
            ->orderByDesc($cData)->limit(200)
            ->get(['id', 'veiculo_id', $cAtual, $cNovo, $cData])
            ->map(fn ($r) => [
                'id'      => $r->id,
                'prefixo' => $r->veiculo?->prefixo ?? '—',
                'data'    => optional($r->{$cData})->toDateString() ?? (string) $r->{$cData},
                'atual'   => (float) $r->{$cAtual},
                'novo'    => (float) $r->{$cNovo},
                'motivo'  => $r->{$cNovo} < $r->{$cAtual} ? 'Leitura menor que a anterior' : 'Salto muito grande',
            ]);

        return [
            'unidade'         => $unidade,
            'veiculos'        => $veiculos,
            'inconsistencias' => $inconsistencias,
            'kpis'            => [
                'veiculos'   => $veiculos->count(),
                'atrasados'  => $veiculos->where('atrasado', true)->count(),
                'com_inconsist' => $veiculos->where('inconsistencias', '>', 0)->count(),
                'leituras_inconsist' => (int) $inconsistencias->count(),
            ],
            'obras'   => \App\Models\Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
            'filtros' => ['q' => $termo, 'obra_id' => $obraId],
            'agora'   => now()->format('d/m/Y H:i:s'),
        ];
    }
}
