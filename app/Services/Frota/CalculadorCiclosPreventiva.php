<?php

namespace App\Services\Frota;

use App\Models\Frota\Veiculo;

/**
 * Centraliza a lógica de cálculo dos ciclos de preventiva.
 *
 * Usado pelo VeiculoController@show (dashboard) e pelo comando
 * frota:alertar-preventivas (varredura da frota para emails).
 *
 * Regras (ver memória frota_preventiva_ciclo):
 *  - Gatilhos: distância (km OU hr, conforme tipo_hr/tipo_km) e/ou tempo
 *    (meses, tipo_tempo). O ciclo vence pelo QUE OCORRER PRIMEIRO.
 *  - Englobamento SEM "OS fantasma": a última execução de um ciclo é a OS
 *    mais recente cujo ciclo executado (campo_cal_*) é >= ao período. Ou seja,
 *    uma OS de 30.000 fecha também os ciclos de 10.000 e 20.000.
 *  - O próximo alvo de um ciclo = medição em que a OS foi executada + período
 *    (não o "próximo" gravado na OS, que é do ciclo dela).
 */
class CalculadorCiclosPreventiva
{
    /** Margem (em dias) para considerar um ciclo por tempo "liberado". */
    private const MARGEM_DIAS = 15;

    public function montar(Veiculo $veiculo): array
    {
        $itens      = $veiculo->preventivasItens()->orderBy('periodo_maq_vei')->get();
        $realizadas = $veiculo->preventivasRealizadas()->get();

        $tipoHr    = (bool) $veiculo->tipo_hr;
        $tipoTempo = (bool) $veiculo->tipo_tempo;
        // Dimensão de distância aplica-se salvo quando o veículo é puramente
        // por tempo (só tipo_tempo). Sem nenhuma flag, assume km (legado).
        $temDistancia = $tipoHr || (bool) $veiculo->tipo_km || ! $tipoTempo;

        $unidade    = $tipoHr ? 'hr' : 'km';
        $distField  = $tipoHr ? 'campo_cal_hr' : 'campo_calc_km';
        $atualField = $tipoHr ? 'horimetro_atual' : 'quilometragem_atual';

        $medicaoAtual = $tipoHr
            ? (int) ($veiculo->horimetros()->orderByDesc('id')->value('horimetro_novo') ?? 0)
            : (int) ($veiculo->quilometragens()->orderByDesc('id')->value('quilometragem_nova') ?? 0);

        $margemDist = $tipoHr ? 100 : 1500;

        // OSs ordenadas da mais recente para a mais antiga (data de conclusão,
        // senão execução; desempate por id). Base para o englobamento.
        $realizadasOrd = $realizadas->sortByDesc(function ($m) {
            $d = $m->data_conclusao ?? $m->data_de_execucao;
            return ($d ? $d->format('Ymd') : '00000000') . str_pad((string) $m->id, 12, '0', STR_PAD_LEFT);
        })->values();

        $grupos = $itens->groupBy('periodo_maq_vei')->sortKeys();
        $ciclosLiberados = [];
        $statusDosCiclos = [];

        foreach ($grupos as $periodo => $itensDoCiclo) {
            $periodo = (int) $periodo;

            // Englobamento: OS mais recente que fechou este ciclo (ou um maior).
            $ultima = $realizadasOrd->first(function ($m) use ($distField, $periodo) {
                $per = (int) ($m->{$distField} ?? 0);
                return $per > 0 && $per >= $periodo;
            });

            // ---- Dimensão distância ----
            $base = $ultima ? (int) ($ultima->{$atualField} ?? 0) : 0;
            $alvo = $base + $periodo;              // próximo alvo do ciclo (englobamento-correto)
            $distancia = $alvo - $medicaoAtual;    // faltam X (negativo = excedido)

            // ---- Dimensão tempo ----
            $periodoMes = (int) ($itensDoCiclo->max('periodo_mes') ?? 0);
            $tempo = null;
            if ($tipoTempo && $periodoMes > 0) {
                $dataBase = $ultima ? ($ultima->data_conclusao ?? $ultima->data_de_execucao) : null;
                $dataVenc = $dataBase ? $dataBase->copy()->addMonths($periodoMes) : null;
                $diasFalt = $dataVenc
                    ? (int) round(now()->startOfDay()->diffInDays($dataVenc->copy()->startOfDay(), false))
                    : null;
                $tempo = [
                    'periodo_mes'     => $periodoMes,
                    'data_base'       => $dataBase?->format('Y-m-d'),
                    'data_vencimento' => $dataVenc?->format('Y-m-d'),
                    'dias_faltantes'  => $diasFalt,   // negativo = vencido
                ];
            }

            // ---- Combinação (o que vencer primeiro) ----
            $liberadoDist  = $temDistancia && $distancia <= $margemDist;
            $vencidoDist   = $temDistancia && $distancia < 0;
            $liberadoTempo = $tempo && $tempo['dias_faltantes'] !== null && $tempo['dias_faltantes'] <= self::MARGEM_DIAS;
            $vencidoTempo  = $tempo && $tempo['dias_faltantes'] !== null && $tempo['dias_faltantes'] < 0;

            $liberado = $liberadoDist || $liberadoTempo;
            $vencido  = $vencidoDist || $vencidoTempo;
            if ($liberado) $ciclosLiberados[] = $periodo;

            // ---- Progresso: o mais adiantado entre distância e tempo ----
            $progDist = 0.0;
            if ($temDistancia) {
                if ($ultima && $alvo > $base) {
                    $progDist = ($medicaoAtual - $base) / ($alvo - $base) * 100;
                } elseif ($periodo > 0) {
                    $progDist = $medicaoAtual / $periodo * 100;
                }
            }
            $progTempo = 0.0;
            if ($tempo && $tempo['data_base'] && $tempo['data_vencimento']) {
                $b = \Illuminate\Support\Carbon::parse($tempo['data_base']);
                $v = \Illuminate\Support\Carbon::parse($tempo['data_vencimento']);
                $tot = $b->diffInDays($v);
                if ($tot > 0) {
                    $progTempo = $b->diffInDays(now(), false) / $tot * 100;
                }
            }
            $progresso = (float) max(0, min(100, max($progDist, $progTempo)));

            $statusDosCiclos[$periodo] = [
                'periodo'         => $periodo,
                'alvo'            => $alvo,
                'distancia'       => $distancia,
                'tem_distancia'   => $temDistancia,
                'unidade'         => $unidade,
                'tempo'           => $tempo,                       // null se não aplica
                'data_vencimento' => $tempo['data_vencimento'] ?? null, // compat card
                'dias_faltantes'  => $tempo['dias_faltantes'] ?? null,
                'liberado'        => $liberado,
                'vencido'         => $vencido,
                'data_ultima'     => $ultima?->data_conclusao?->format('Y-m-d')
                                     ?? $ultima?->data_de_execucao?->format('Y-m-d'),
                'progresso'       => round($progresso, 1),
                'qtd_itens'       => $itensDoCiclo->count(),
            ];
        }

        $cicloMestre = ! empty($ciclosLiberados) ? max($ciclosLiberados) : null;

        foreach ($statusDosCiclos as $periodo => &$st) {
            // Precedência: o ciclo MESTRE (maior liberado) é sempre acionável —
            // mesmo vencido, pois é justamente o que se executa (engloba os
            // menores). A flag `vencido` continua no payload para o card pintar
            // de vermelho sem travar o botão.
            if ($st['liberado'] && $periodo === $cicloMestre) {
                $st['estado']   = 'mestre';
                $st['bloqueio'] = null;
            } elseif ($st['liberado']) {
                $st['estado']   = 'bloqueado_por_maior';
                $st['bloqueio'] = 'Realize a OS de ' . number_format($cicloMestre, 0, ',', '.');
            } elseif ($st['vencido']) {
                $st['estado']   = 'vencido';
                $st['bloqueio'] = $this->textoVencido($st, $unidade);
            } else {
                $st['estado']   = 'aguardando';
                $st['bloqueio'] = $this->textoAguardando($st, $unidade);
            }
        }
        unset($st);

        return [
            'medicao_atual' => $medicaoAtual,
            'unidade'       => $unidade,
            'tem_tempo'     => $tipoTempo,
            'margem'        => $margemDist,
            'ciclo_mestre'  => $cicloMestre,
            'ciclos'        => array_values($statusDosCiclos),
        ];
    }

    private function textoVencido(array $st, string $unidade): string
    {
        $partes = [];
        if ($st['tem_distancia'] && $st['distancia'] < 0) {
            $partes[] = 'Excedido em ' . number_format(abs($st['distancia']), 0, ',', '.') . " {$unidade}";
        }
        if ($st['dias_faltantes'] !== null && $st['dias_faltantes'] < 0) {
            $partes[] = 'Vencido há ' . abs($st['dias_faltantes']) . ' dia(s)';
        }
        return implode(' · ', $partes) ?: 'Vencido';
    }

    private function textoAguardando(array $st, string $unidade): string
    {
        $partes = [];
        if ($st['tem_distancia']) {
            $partes[] = 'Faltam ' . number_format($st['distancia'], 0, ',', '.') . " {$unidade}";
        }
        if ($st['dias_faltantes'] !== null) {
            $partes[] = $st['dias_faltantes'] . ' dia(s)';
        }
        return implode(' · ', $partes) ?: 'Aguardando';
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
