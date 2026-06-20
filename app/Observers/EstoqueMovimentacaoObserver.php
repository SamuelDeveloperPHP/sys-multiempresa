<?php

namespace App\Observers;

use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Saldo;
use Illuminate\Support\Facades\DB;

/**
 * Observer que mantém estoque_saldos consistente com estoque_movimentacoes.
 *
 * Estratégia:
 *   - created : aplica delta no saldo (cria linha se não existir)
 *   - updated : reverte o delta antigo e aplica o novo (suporta corrigir
 *               quantidade/tipo manualmente — uso raro mas suportado)
 *   - deleted : reverte o delta (soft delete também reverte para preservar
 *               o saldo correto; o registro fica acessível via withTrashed)
 *
 * Preço Médio Ponderado (PMP) é atualizado APENAS em entradas:
 *   novo_pmp = (qtd_atual × pmp_atual + qtd_entrada × valor_unitario) / (qtd_atual + qtd_entrada)
 *
 * IMPORTANTE: todas as operações são feitas dentro de transação para evitar
 * race condition entre dois requests simultâneos.
 */
class EstoqueMovimentacaoObserver
{
    public function created(Movimentacao $mov): void
    {
        DB::transaction(function () use ($mov) {
            $this->aplicarDelta($mov, 1);
        });
    }

    public function updated(Movimentacao $mov): void
    {
        // Detecta se algum campo que afeta o saldo mudou
        $camposCriticos = ['produto_id', 'obra_id', 'tipo', 'quantidade', 'valor_unitario'];
        $changed = false;
        foreach ($camposCriticos as $campo) {
            if ($mov->isDirty($campo)) { $changed = true; break; }
        }
        if (!$changed) return;

        DB::transaction(function () use ($mov) {
            // Reverte estado anterior usando getOriginal()
            $original = $mov->getOriginal();
            $velha = new Movimentacao();
            $velha->forceFill($original);
            $this->aplicarDelta($velha, -1);

            // Aplica novo estado
            $this->aplicarDelta($mov, 1);
        });
    }

    public function deleted(Movimentacao $mov): void
    {
        DB::transaction(function () use ($mov) {
            $this->aplicarDelta($mov, -1);
        });
    }

    /**
     * Restaura ao reverter soft-delete.
     */
    public function restored(Movimentacao $mov): void
    {
        DB::transaction(function () use ($mov) {
            $this->aplicarDelta($mov, 1);
        });
    }

    // -----------------------------------------------------------------------

    /**
     * Aplica o delta da movimentação ao saldo correspondente.
     *
     * @param int $multiplicador  +1 para aplicar, -1 para reverter
     */
    private function aplicarDelta(Movimentacao $mov, int $multiplicador): void
    {
        // Saldo é chaveado por (produto, obra, variante). Para material comum
        // variante_id = null → mesma chave de antes (retrocompatível).
        $saldo = Saldo::firstOrNew([
            'produto_id'  => $mov->produto_id,
            'obra_id'     => $mov->obra_id,
            'variante_id' => $mov->variante_id,
        ]);
        if (!$saldo->exists) {
            $saldo->company_id  = $mov->company_id;
            $saldo->quantidade  = 0;
            $saldo->valor_medio = 0;
        }

        $qtdAntes = (float) $saldo->quantidade;
        $pmpAntes = (float) $saldo->valor_medio;

        $delta = (float) $mov->quantidade * $mov->sinal * $multiplicador;
        $qtdDepois = $qtdAntes + $delta;

        // PMP: só atualiza em ENTRADA forward (multiplicador=+1, tipo entrada,
        // qtd_antes>=0 e qtd_depois>0). Reversão não altera PMP — fica como estava.
        $pmpDepois = $pmpAntes;
        $ehEntrada = in_array($mov->tipo, Movimentacao::TIPOS_ENTRADA, true);
        if ($multiplicador === 1 && $ehEntrada && $mov->valor_unitario > 0 && $qtdDepois > 0) {
            $custoAntes = $qtdAntes * $pmpAntes;
            $custoEntrada = (float) $mov->quantidade * (float) $mov->valor_unitario;
            $pmpDepois = ($custoAntes + $custoEntrada) / $qtdDepois;
        }

        $saldo->quantidade = $qtdDepois;
        $saldo->valor_medio = $pmpDepois;
        $saldo->ultima_movimentacao_at = now();
        $saldo->save();
    }
}
