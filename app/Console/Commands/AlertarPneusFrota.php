<?php

namespace App\Console\Commands;

use App\Models\Frota\Pneu;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Varre os pneus MONTADOS e sinaliza os que estao com sulco abaixo do limite de
 * alerta (config frota_pneus.sulco). Envia 1 email consolidado.
 *
 *   php artisan frota:alertar-pneus
 *   php artisan frota:alertar-pneus --dry-run
 *   php artisan frota:alertar-pneus --email=foo@bar.com
 */
class AlertarPneusFrota extends Command
{
    protected $signature = 'frota:alertar-pneus
                            {--dry-run : Nao envia email, so mostra}
                            {--email= : Destinatario unico}';

    protected $description = 'Alerta de pneus com sulco abaixo do limite (gestao de pneus)';

    public function handle(): int
    {
        $alerta = (float) config('frota_pneus.sulco.alerta', 3.0);
        $minimo = (float) config('frota_pneus.sulco.minimo_legal', 1.6);

        $pneus = Pneu::withoutGlobalScopes()
            ->where('situacao', 'montado')
            ->whereNull('deleted_at')
            ->with(['ultimaInspecao', 'ultimaMovimentacao.veiculo'])
            ->get();

        $criticos = [];
        foreach ($pneus as $p) {
            $sulco = optional($p->ultimaInspecao)->sulco_mm;
            if ($sulco === null || (float) $sulco >= $alerta) continue;

            $mov = $p->movimentacoes()->whereIn('tipo', ['montagem', 'rodizio'])
                ->orderByDesc('data')->orderByDesc('id')->with('veiculo:id,prefixo')->first();

            $criticos[] = [
                'numero_fogo' => $p->numero_fogo,
                'sulco'       => (float) $sulco,
                'nivel'       => (float) $sulco < $minimo ? 'CRÍTICO (abaixo do legal)' : 'atenção',
                'veiculo'     => optional($mov?->veiculo)->prefixo ?? '—',
                'posicao'     => $mov?->posicao ?? '—',
            ];
        }

        if (empty($criticos)) {
            $this->info('Nenhum pneu com sulco crítico. Nada a enviar.');
            return self::SUCCESS;
        }

        usort($criticos, fn ($a, $b) => $a['sulco'] <=> $b['sulco']);

        $linhas = array_map(
            fn ($c) => sprintf('  • %s | %s pos. %s | sulco %.1f mm — %s',
                $c['numero_fogo'], $c['veiculo'], $c['posicao'], $c['sulco'], $c['nivel']),
            $criticos
        );
        $corpo = "Pneus com sulco abaixo de {$alerta} mm (limite legal {$minimo} mm):\n\n" . implode("\n", $linhas);

        $this->warn(count($criticos) . ' pneu(s) crítico(s):');
        $this->line($corpo);

        if ($this->option('dry-run')) {
            $this->warn('Modo --dry-run: nenhum email enviado.');
            return self::SUCCESS;
        }

        $destinatarios = $this->destinatarios();
        if (empty($destinatarios)) {
            $this->error('Nenhum destinatário configurado (FROTA_ALERTAS_EMAIL ou --email=).');
            return self::FAILURE;
        }

        try {
            Mail::raw($corpo, function ($m) use ($destinatarios) {
                $m->to($destinatarios)->subject('[Frota] Pneus com sulco crítico');
            });
            $this->info('Email enviado: ' . implode(', ', $destinatarios));
        } catch (\Throwable $e) {
            $this->error('Falha ao enviar email: ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    protected function destinatarios(): array
    {
        if ($email = $this->option('email')) return [$email];
        $cfg = config('frota.alertas_email', []);
        if (! empty($cfg)) return $cfg;
        $sa = User::where('type', 'super_admin')->first();
        return $sa?->email ? [$sa->email] : [];
    }
}
