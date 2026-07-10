<?php

namespace App\Services\Frota;

use App\Models\Frota\Veiculo;
use Carbon\Carbon;

/**
 * Calcula o valor depreciado de um veiculo/maquina numa data de referencia.
 *
 * Metodos:
 *  - horimetro:         (base - residual) x (horas_uso / vida_util_horas)  [linha amarela]
 *  - linear:            cota constante por mes desde a aquisicao
 *  - saldo_decrescente: double-declining (dobro da taxa linear), piso no residual
 *  - mercado:           usa o ultimo valor de mercado/FIPE conhecido do ativo
 *
 * Todos os metodos sao deterministicos e locais (nenhuma chamada externa),
 * de modo que o job mensal nao depende de API de terceiros. O 'mercado' usa o
 * valor de FIPE ja gravado no cadastro do veiculo (mantido pelo formulario).
 *
 * Retorna sempre um array com valor_atual, depreciacao_acumulada, metodo e a
 * memoria de calculo (para auditoria). Ver `frota_depreciacao` config.
 */
class CalculadorDepreciacao
{
    public function calcular(Veiculo $veiculo, ?Carbon $data = null): array
    {
        $data = ($data ? $data->copy() : Carbon::now())->endOfDay();

        $metodo = $this->resolverMetodo($veiculo);
        $base   = $this->valorBase($veiculo);

        if ($base === null || $base <= 0) {
            return $this->indisponivel($metodo, 'Sem valor de aquisição/FIPE cadastrado.');
        }

        $residual = $this->valorResidual($veiculo, $base);

        return match ($metodo) {
            'horimetro'         => $this->porHorimetro($veiculo, $base, $residual, $data),
            'saldo_decrescente' => $this->porSaldoDecrescente($veiculo, $base, $residual, $data),
            'mercado'           => $this->porMercado($veiculo, $base, $residual, $data),
            default             => $this->linear($veiculo, $base, $residual, $data),
        };
    }

    /** Nome do mes (pt) para a coluna referencia_mes do snapshot. */
    public function referenciaMes(Carbon $data): string
    {
        $meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return $meses[$data->month - 1];
    }

    // ---------------------------------------------------------------- métodos

    protected function linear(Veiculo $v, float $base, float $residual, Carbon $data): array
    {
        $anos      = $this->vidaUtilAnos($v);
        $mesesVida = max(1, $anos * 12);
        $inicio    = $this->dataAquisicao($v);
        $meses     = min($this->mesesEntre($inicio, $data), $mesesVida);

        $depreciavel = max(0.0, $base - $residual);
        $depMensal   = $depreciavel / $mesesVida;
        $acumulada   = round(min($depMensal * $meses, $depreciavel), 2);
        $valorAtual  = round($base - $acumulada, 2);

        return $this->resultado('linear', $base, $residual, $acumulada, $valorAtual, $data, [
            'vida_util_anos'     => $anos,
            'meses_decorridos'   => $meses,
            'meses_vida'         => $mesesVida,
            'depreciacao_mensal' => round($depMensal, 2),
            'data_aquisicao'     => $inicio->toDateString(),
            'taxa_anual_pct'     => round(100 / $anos, 2),
        ]);
    }

    protected function porHorimetro(Veiculo $v, float $base, float $residual, Carbon $data): array
    {
        $horasVida = max(1, $this->vidaUtilHoras($v));
        $inicial   = (int) ($v->horimetro_inicial ?? 0);
        $atual     = $this->horimetroAtual($v);

        if ($atual === null) {
            $r = $this->linear($v, $base, $residual, $data);
            $r['aviso'] = 'Sem leitura de horímetro; usado método linear.';
            return $r;
        }

        $horasUso    = max(0, $atual - $inicial);
        $frac        = min(1.0, $horasUso / $horasVida);
        $depreciavel = max(0.0, $base - $residual);
        $acumulada   = round($depreciavel * $frac, 2);
        $valorAtual  = round($base - $acumulada, 2);

        return $this->resultado('horimetro', $base, $residual, $acumulada, $valorAtual, $data, [
            'horimetro_inicial' => $inicial,
            'horimetro_atual'   => $atual,
            'horas_uso'         => $horasUso,
            'vida_util_horas'   => $horasVida,
            'percentual_vida'   => round($frac * 100, 2),
            'custo_por_hora'    => round($depreciavel / $horasVida, 2),
        ]);
    }

    protected function porSaldoDecrescente(Veiculo $v, float $base, float $residual, Carbon $data): array
    {
        $anos       = $this->vidaUtilAnos($v);
        $inicio     = $this->dataAquisicao($v);
        $meses      = min($this->mesesEntre($inicio, $data), $anos * 12);
        $taxaAnual  = 2.0 / $anos;          // dobro da linear
        $taxaMensal = $taxaAnual / 12;

        $valor = $base;
        for ($i = 0; $i < $meses; $i++) {
            $valor -= $valor * $taxaMensal;
            if ($valor <= $residual) { $valor = $residual; break; }
        }
        $valorAtual = round(max($valor, $residual), 2);
        $acumulada  = round($base - $valorAtual, 2);

        return $this->resultado('saldo_decrescente', $base, $residual, $acumulada, $valorAtual, $data, [
            'vida_util_anos'   => $anos,
            'meses_decorridos' => $meses,
            'taxa_anual_pct'   => round($taxaAnual * 100, 2),
            'data_aquisicao'   => $inicio->toDateString(),
        ]);
    }

    protected function porMercado(Veiculo $v, float $base, float $residual, Carbon $data): array
    {
        $mercado = $v->valor_mercado !== null ? (float) $v->valor_mercado
                 : ($v->valor_fipe !== null ? (float) $v->valor_fipe : null);

        if ($mercado === null) {
            $r = $this->linear($v, $base, $residual, $data);
            $r['aviso'] = 'Sem valor de mercado/FIPE; usado método linear.';
            return $r;
        }

        $valorAtual = round($mercado, 2);
        $acumulada  = round(max(0.0, $base - $valorAtual), 2);

        return $this->resultado('mercado', $base, $residual, $acumulada, $valorAtual, $data, [
            'fonte'               => $v->valor_mercado !== null ? 'valor_mercado' : 'valor_fipe',
            'valor_mercado'       => $valorAtual,
            'fipe_mes_referencia' => $v->fipe_mes_referencia,
            'codigo_fipe'         => $v->codigo_fipe,
        ]);
    }

    // -------------------------------------------------------------- parâmetros

    protected function resolverMetodo(Veiculo $v): string
    {
        $explicito = $v->metodo_depreciacao;
        if ($explicito && in_array($explicito, config('frota_depreciacao.metodos', []), true)) {
            return $explicito;
        }
        if ($v->tipo_hr) return 'horimetro';
        if ($v->valor_mercado !== null || $v->valor_fipe !== null) return 'mercado';
        return config('frota_depreciacao.metodo_padrao', 'linear');
    }

    protected function classe(Veiculo $v): string
    {
        return $v->tipo_hr ? 'maquina' : 'rodoviario';
    }

    protected function valorBase(Veiculo $v): ?float
    {
        foreach (['valor_aquisicao', 'valor_fipe', 'valor_mercado'] as $campo) {
            if ($v->{$campo} !== null && (float) $v->{$campo} > 0) {
                return (float) $v->{$campo};
            }
        }
        return null;
    }

    protected function valorResidual(Veiculo $v, float $base): float
    {
        if ($v->valor_residual !== null) return (float) $v->valor_residual;
        $pct = (float) config('frota_depreciacao.residual_pct.' . $this->classe($v), 0.10);
        return round($base * $pct, 2);
    }

    protected function vidaUtilAnos(Veiculo $v): int
    {
        if ($v->vida_util_anos) return (int) $v->vida_util_anos;
        return (int) config('frota_depreciacao.vida_util_anos.' . $this->classe($v), 5);
    }

    protected function vidaUtilHoras(Veiculo $v): int
    {
        return (int) ($v->vida_util_horas ?: config('frota_depreciacao.vida_util_horas.default', 10000));
    }

    protected function dataAquisicao(Veiculo $v): Carbon
    {
        if ($v->data_aquisicao) return Carbon::parse($v->data_aquisicao);
        return Carbon::parse($v->created_at ?? Carbon::now());
    }

    /** Meses inteiros (cheios) decorridos — convencao contabil, evita fracao. */
    protected function mesesEntre(Carbon $inicio, Carbon $fim): int
    {
        if ($fim->lessThanOrEqualTo($inicio)) return 0;
        return (int) floor($inicio->diffInMonths($fim));
    }

    protected function horimetroAtual(Veiculo $v): ?int
    {
        // Horimetro e cumulativo/monotonico: as horas TOTAIS rodadas sao o maior
        // valor lido (nao a ultima leitura por id, que pode estar fora de ordem).
        // Coincide com o horimetro exibido no cabecalho do veiculo (max).
        $val = $v->horimetros()->max('horimetro_novo');
        return $val === null ? null : (int) $val;
    }

    // ------------------------------------------------------------------ saída

    protected function resultado(string $metodo, float $base, float $residual, float $acumulada, float $valorAtual, Carbon $data, array $memoria): array
    {
        $valorAtual = max($valorAtual, 0.0);
        return [
            'ok'                    => true,
            'aviso'                 => null,
            'metodo'                => $metodo,
            'data_referencia'       => $data->toDateString(),
            'valor_base'            => round($base, 2),
            'valor_residual'        => round($residual, 2),
            'depreciavel'           => round(max(0.0, $base - $residual), 2),
            'depreciacao_acumulada' => $acumulada,
            'valor_atual'           => $valorAtual,
            'percentual_depreciado' => $base > 0 ? round($acumulada / $base * 100, 2) : 0,
            'memoria'               => $memoria,
        ];
    }

    protected function indisponivel(string $metodo, string $motivo): array
    {
        return [
            'ok'                    => false,
            'aviso'                 => $motivo,
            'metodo'                => $metodo,
            'data_referencia'       => Carbon::now()->toDateString(),
            'valor_base'            => null,
            'valor_residual'        => null,
            'depreciavel'           => null,
            'depreciacao_acumulada' => null,
            'valor_atual'           => null,
            'percentual_depreciado' => null,
            'memoria'               => [],
        ];
    }
}
