<?php

namespace App\Services\Frota;

use App\Models\Frota\Veiculo;

/**
 * Centraliza a lógica de cálculo dos ciclos de preventiva.
 *
 * Usado pelo VeiculoController@show (para o dashboard) e pelo comando
 * frota:alertar-preventivas (para varrer toda a frota e disparar emails).
 */
class CalculadorCiclosPreventiva
{
    public function montar(Veiculo $veiculo): array
    {
        $itens      = $veiculo->preventivasItens()->orderBy('periodo_maq_vei')->get();
        $realizadas = $veiculo->preventivasRealizadas()->get();

        $medicaoAtual = $veiculo->tipo_hr
            ? (int) ($veiculo->horimetros()->orderByDesc('id')->value('horimetro_novo') ?? 0)
            : (int) ($veiculo->quilometragens()->orderByDesc('id')->value('quilometragem_nova') ?? 0);

        $margem = $veiculo->tipo_hr ? 100 : 1500;

        $grupos = $itens->groupBy('periodo_maq_vei')->sortKeys();
        $ciclosLiberados = [];
        $statusDosCiclos = [];

        foreach ($grupos as $periodo => $itensDoCiclo) {
            $ultima = $realizadas->first(function ($m) use ($periodo, $veiculo) {
                $perDb = $veiculo->tipo_hr ? $m->campo_cal_hr : $m->campo_calc_km;
                return (int) $perDb === (int) $periodo;
            });

            $alvo = (int) $periodo;
            $dataUltima = null;
            $dataVencimento = null;
            $baseMedicao = null;

            if ($ultima) {
                $alvo = $veiculo->tipo_hr ? (int) $ultima->horimetro_proximo : (int) $ultima->quilometragem_nova;
                $baseMedicao = $veiculo->tipo_hr ? (int) $ultima->horimetro_atual : (int) $ultima->quilometragem_atual;
                $dataUltima = $ultima->data_conclusao?->format('Y-m-d');
                if ($ultima->data_de_vencimento && $ultima->data_de_vencimento->format('Y') > 1900) {
                    $dataVencimento = $ultima->data_de_vencimento->format('Y-m-d');
                }
            }

            $distancia = $alvo - $medicaoAtual;
            $liberado  = $distancia <= $margem;
            if ($liberado) $ciclosLiberados[] = (int) $periodo;

            $progresso = 0;
            if ($ultima && $baseMedicao !== null) {
                $totalPercorrer = $alvo - $baseMedicao;
                $jaPercorrido   = $medicaoAtual - $baseMedicao;
                if ($totalPercorrer > 0) $progresso = ($jaPercorrido / $totalPercorrer) * 100;
            } elseif ($periodo > 0) {
                $progresso = ($medicaoAtual / $periodo) * 100;
            }
            $progresso = (float) max(0, min(100, $progresso));

            $statusDosCiclos[(int) $periodo] = [
                'periodo'         => (int) $periodo,
                'alvo'            => $alvo,
                'distancia'       => $distancia,
                'liberado'        => $liberado,
                'data_ultima'     => $dataUltima,
                'data_vencimento' => $dataVencimento,
                'progresso'       => round($progresso, 1),
                'qtd_itens'       => $itensDoCiclo->count(),
            ];
        }

        $cicloMestre = !empty($ciclosLiberados) ? max($ciclosLiberados) : null;

        foreach ($statusDosCiclos as $periodo => &$st) {
            if ($st['liberado'] && $periodo === $cicloMestre) {
                $st['estado']   = 'mestre';
                $st['bloqueio'] = null;
            } elseif ($st['liberado']) {
                $st['estado']   = 'bloqueado_por_maior';
                $st['bloqueio'] = 'Realize a OS de ' . number_format($cicloMestre, 0, ',', '.');
            } elseif ($st['distancia'] < 0) {
                $st['estado']   = 'vencido';
                $unidade = $veiculo->tipo_hr ? 'hr' : 'km';
                $st['bloqueio'] = 'Excedido em ' . number_format(abs($st['distancia']), 0, ',', '.') . " {$unidade}";
            } else {
                $st['estado']   = 'aguardando';
                $unidade = $veiculo->tipo_hr ? 'hr' : 'km';
                $st['bloqueio'] = 'Faltam ' . number_format($st['distancia'], 0, ',', '.') . " {$unidade}";
            }
        }
        unset($st);

        return [
            'medicao_atual' => $medicaoAtual,
            'unidade'       => $veiculo->tipo_hr ? 'hr' : 'km',
            'margem'        => $margem,
            'ciclo_mestre'  => $cicloMestre,
            'ciclos'        => array_values($statusDosCiclos),
        ];
    }

    /**
     * Retorna apenas os ciclos que precisam de atenção (vencidos ou
     * "mestre" — prontos para executar). Útil para o disparo de emails.
     */
    public function ciclosCriticos(Veiculo $veiculo): array
    {
        $dashboard = $this->montar($veiculo);
        return collect($dashboard['ciclos'])
            ->filter(fn ($c) => in_array($c['estado'], ['vencido', 'mestre'], true))
            ->values()
            ->all();
    }
}
