<?php

namespace App\Console\Commands;

use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoDepreciacao;
use App\Services\Frota\CalculadorDepreciacao;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Gera o snapshot mensal de depreciacao de cada veiculo/maquina ativo.
 *
 * Idempotente: se ja existe snapshot para o mes/ano de referencia, atualiza
 * (quando origem = calculado) ou PRESERVA (quando origem = manual). Nunca
 * sobrescreve um valor lancado a mao.
 *
 * Uso:
 *   php artisan frota:calcular-depreciacao
 *   php artisan frota:calcular-depreciacao --dry-run
 *   php artisan frota:calcular-depreciacao --company=1 --mes=6 --ano=2026
 *   php artisan frota:calcular-depreciacao --veiculo=42
 */
class CalcularDepreciacaoFrota extends Command
{
    protected $signature = 'frota:calcular-depreciacao
                            {--dry-run : Nao grava, so mostra o que seria calculado}
                            {--company= : Filtra uma empresa}
                            {--veiculo= : Filtra um veiculo especifico}
                            {--mes= : Mes de referencia (1-12; default: mes atual)}
                            {--ano= : Ano de referencia (default: ano atual)}';

    protected $description = 'Calcula e grava o snapshot mensal de depreciacao da frota';

    public function handle(CalculadorDepreciacao $calc): int
    {
        $data = $this->dataReferencia()->endOfMonth();
        $mesNome = $calc->referenciaMes($data);
        $ano     = (string) $data->year;
        $dry     = (bool) $this->option('dry-run');

        $query = Veiculo::withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->where('situacao', 'Ativo');

        if ($c = $this->option('company')) $query->where('company_id', (int) $c);
        if ($v = $this->option('veiculo')) $query->where('id', (int) $v);

        $veiculos = $query->get();
        $this->info("Referência {$mesNome}/{$ano} — {$veiculos->count()} veículo(s).");

        $gravados = 0; $preservados = 0; $pulados = 0;
        foreach ($veiculos as $veiculo) {
            $res = $calc->calcular($veiculo, $data);

            if (! $res['ok']) {
                $pulados++;
                $this->line("  · {$veiculo->prefixo}: pulado ({$res['aviso']})");
                continue;
            }

            $existente = VeiculoDepreciacao::withoutGlobalScopes()
                ->where('veiculo_id', $veiculo->id)
                ->where('referencia_mes', $mesNome)
                ->where('referencia_ano', $ano)
                ->first();

            if ($existente && $existente->origem === 'manual') {
                $preservados++;
                $this->line("  · {$veiculo->prefixo}: manual preservado");
                continue;
            }

            $this->line(sprintf(
                '  · %s [%s]: valor atual R$ %s (dep. acum. R$ %s)%s',
                $veiculo->prefixo, $res['metodo'],
                number_format($res['valor_atual'], 2, ',', '.'),
                number_format($res['depreciacao_acumulada'], 2, ',', '.'),
                $res['aviso'] ? " — {$res['aviso']}" : ''
            ));

            if ($dry) continue;

            $payload = [
                'company_id'            => $veiculo->company_id,
                'veiculo_id'            => $veiculo->id,
                'valor_atual'           => $res['valor_atual'],
                'referencia_mes'        => $mesNome,
                'referencia_ano'        => $ano,
                'origem'                => 'calculado',
                'metodo'                => $res['metodo'],
                'valor_base'            => $res['valor_base'],
                'depreciacao_acumulada' => $res['depreciacao_acumulada'],
                'memoria_calculo'       => $res['memoria'],
                'user_edit'             => 'sistema',
            ];

            if ($existente) {
                $existente->update($payload);
            } else {
                VeiculoDepreciacao::create($payload + ['user_create' => 'sistema']);
            }
            $gravados++;
        }

        $this->info("Gravados: {$gravados} | Manuais preservados: {$preservados} | Pulados: {$pulados}");
        return self::SUCCESS;
    }

    protected function dataReferencia(): Carbon
    {
        $ano = $this->option('ano');
        $mes = $this->option('mes');
        if ($ano && $mes) {
            return Carbon::create((int) $ano, (int) $mes, 1);
        }
        return Carbon::now();
    }
}
