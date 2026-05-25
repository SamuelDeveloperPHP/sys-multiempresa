<?php

namespace App\Console\Commands\Estoque;

use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Saldo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Recalcula estoque_saldos a partir de zero, somando todas as movimentações.
 *
 * Use quando:
 *   - Suspeita de inconsistência no saldo (após erros, migrações manuais, ETL)
 *   - Após corrigir movimentações em lote
 *
 * Uso:
 *   php artisan estoque:recalcular-saldos
 *   php artisan estoque:recalcular-saldos --company=1
 *   php artisan estoque:recalcular-saldos --dry-run
 */
class RecalcularSaldos extends Command
{
    protected $signature = 'estoque:recalcular-saldos
                            {--company= : ID da empresa (default: todas)}
                            {--dry-run : Apenas mostra o que seria feito sem persistir}';

    protected $description = 'Recalcula estoque_saldos a partir das movimentações registradas';

    public function handle(): int
    {
        $companyId = $this->option('company');
        $dryRun    = (bool) $this->option('dry-run');

        $this->info('Recalculando saldos…' . ($dryRun ? ' (DRY-RUN — não persiste)' : ''));

        // 1. Apaga saldos atuais (do escopo).
        // 2. Para cada (produto, obra) com pelo menos 1 movimentação, recalcula.
        $movQuery = Movimentacao::query();
        if ($companyId) {
            $movQuery->where('company_id', $companyId);
        }

        $combos = $movQuery
            ->select('company_id', 'produto_id', 'obra_id')
            ->groupBy('company_id', 'produto_id', 'obra_id')
            ->get();

        $this->info("Combinações (produto × obra) a recalcular: {$combos->count()}");

        $bar = $this->output->createProgressBar($combos->count());
        $bar->start();

        DB::transaction(function () use ($combos, $dryRun, $companyId) {
            if (!$dryRun) {
                $deleteQuery = Saldo::query();
                if ($companyId) {
                    $deleteQuery->where('company_id', $companyId);
                }
                $deleteQuery->delete();
            }

            foreach ($combos as $combo) {
                $movs = Movimentacao::where('produto_id', $combo->produto_id)
                    ->where('obra_id', $combo->obra_id)
                    ->orderBy('data_movimento')
                    ->orderBy('id')
                    ->get();

                $qtd = 0.0;
                $pmp = 0.0;

                foreach ($movs as $m) {
                    $delta = (float) $m->quantidade * $m->sinal;
                    $qtdAntes = $qtd;
                    $qtd = $qtd + $delta;

                    // PMP: só atualiza em entradas
                    if (in_array($m->tipo, Movimentacao::TIPOS_ENTRADA, true) && $m->valor_unitario > 0 && $qtd > 0) {
                        $custoAntes = $qtdAntes * $pmp;
                        $custoEntrada = (float) $m->quantidade * (float) $m->valor_unitario;
                        $pmp = ($custoAntes + $custoEntrada) / $qtd;
                    }
                }

                if (!$dryRun) {
                    Saldo::create([
                        'company_id'  => $combo->company_id,
                        'produto_id'  => $combo->produto_id,
                        'obra_id'     => $combo->obra_id,
                        'quantidade'  => $qtd,
                        'valor_medio' => $pmp,
                        'ultima_movimentacao_at' => $movs->last()?->updated_at,
                    ]);
                }
            }
        });

        $bar->finish();
        $this->newLine(2);
        $this->info('OK — saldos recalculados.');
        return self::SUCCESS;
    }
}
