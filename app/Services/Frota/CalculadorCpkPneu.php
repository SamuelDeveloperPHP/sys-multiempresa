<?php

namespace App\Services\Frota;

use App\Models\Frota\Pneu;
use App\Models\Frota\Veiculo;

/**
 * Calcula o CPK (Custo Por Quilometro) de um pneu — a metrica-rainha da gestao
 * de pneus.
 *
 *   CPK = custo_total / rodado
 *   custo_total = valor_compra + Σ recapagens + Σ consertos
 *   rodado      = Σ (medicao_saida − medicao_entrada) de cada intervalo montado
 *
 * O "rodado" vem do ledger (pneu_movimentacoes): a cada montagem abre um
 * intervalo, a cada desmontagem/recapagem/sucateamento fecha (delta do
 * hodometro/horimetro do veiculo). Rodizio NAO fecha o intervalo (o pneu segue
 * montado, so muda de posicao). Se ainda esta montado, soma ate a medicao atual
 * do veiculo (max — mesma fonte do cabecalho/depreciacao).
 *
 * Unidade: km ou hr (linha amarela) conforme medicao_tipo dos eventos. Em ativo
 * horimetrado o "CPK" e, na pratica, custo por hora (CPH).
 */
class CalculadorCpkPneu
{
    public function calcular(Pneu $pneu): array
    {
        $movs = $pneu->movimentacoes()->orderBy('data')->orderBy('id')->get();

        $custoRecap   = (float) $movs->where('tipo', 'recapagem')->sum('valor');
        $custoConsert = (float) $movs->where('tipo', 'conserto')->sum('valor');
        $custoCompra  = (float) ($pneu->valor_compra ?? 0);
        $custoTotal   = $custoCompra + $custoRecap + $custoConsert;

        $rodado   = 0;
        $unidade  = null;
        $aberto   = null; // ['veiculo_id'=>, 'medicao'=>]
        $intervalos = [];

        foreach ($movs as $m) {
            if ($m->tipo === 'montagem') {
                $aberto = ['veiculo_id' => $m->veiculo_id, 'medicao' => $m->medicao];
                if ($m->medicao_tipo) $unidade = $m->medicao_tipo;
            } elseif (in_array($m->tipo, ['desmontagem', 'recapagem', 'sucateamento'], true) && $aberto) {
                $delta = $this->delta($aberto, $m->veiculo_id, $m->medicao);
                if ($delta !== null) { $rodado += $delta; $intervalos[] = $delta; }
                $aberto = null;
            }
            // 'rodizio' e 'conserto' e 'compra' nao fecham o intervalo aqui.
        }

        // Intervalo ainda aberto: pneu montado -> soma ate a medicao atual do veiculo.
        if ($aberto && $pneu->situacao === 'montado' && $aberto['veiculo_id']) {
            $atual = $this->medicaoAtualVeiculo($aberto['veiculo_id'], $unidade);
            $delta = $this->delta($aberto, $aberto['veiculo_id'], $atual);
            if ($delta !== null) { $rodado += $delta; $intervalos[] = $delta; }
        }

        $unidade = $unidade ?: 'km';
        $cpk = $rodado > 0 ? round($custoTotal / $rodado, 4) : null;

        return [
            'custo_compra'      => round($custoCompra, 2),
            'custo_recapagens'  => round($custoRecap, 2),
            'custo_consertos'   => round($custoConsert, 2),
            'custo_total'       => round($custoTotal, 2),
            'rodado'            => $rodado,
            'unidade'           => $unidade,
            'cpk'               => $cpk,
            'cpk_label'         => $unidade === 'hr' ? 'R$/h' : 'R$/km',
            'intervalos'        => $intervalos,
        ];
    }

    /** Delta valido: mesmo veiculo, ambas medicoes presentes, nao-negativo. */
    protected function delta(array $aberto, ?int $veiculoId, ?int $medicao): ?int
    {
        if ($aberto['medicao'] === null || $medicao === null) return null;
        if ($aberto['veiculo_id'] !== $veiculoId) return null; // trocou de veiculo: nao computa
        $d = $medicao - $aberto['medicao'];
        return $d > 0 ? $d : 0;
    }

    /** Medicao atual do veiculo (max — km ou hr), coerente com o resto do sistema. */
    protected function medicaoAtualVeiculo(int $veiculoId, ?string $unidade): ?int
    {
        $v = Veiculo::withoutGlobalScopes()->find($veiculoId);
        if (! $v) return null;
        $usaHr = $unidade ? ($unidade === 'hr') : (bool) $v->tipo_hr;
        $val = $usaHr
            ? $v->horimetros()->max('horimetro_novo')
            : $v->quilometragens()->max('quilometragem_nova');
        return $val === null ? null : (int) $val;
    }
}
