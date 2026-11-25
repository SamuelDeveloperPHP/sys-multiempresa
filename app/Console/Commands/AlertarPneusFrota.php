<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\Frota\Pneu;
use App\Models\Frota\PneuInspecao;
use App\Models\Frota\PneuMontagemAtiva;
use App\Models\Frota\Veiculo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Varre os pneus montados por empresa e envia alertas isolados por tenant.
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

        $encontrados = 0;
        $falhou = false;

        Company::query()->where('is_active', true)->orderBy('id')->each(function (Company $company) use ($alerta, $minimo, &$encontrados, &$falhou) {
            $criticos = $this->criticosDaEmpresa($company, $alerta, $minimo);
            if (empty($criticos)) {
                return;
            }

            $encontrados += count($criticos);
            usort($criticos, fn ($a, $b) => $a['sulco'] <=> $b['sulco']);
            $linhas = array_map(
                fn ($c) => sprintf('  • %s | %s pos. %s | sulco %.1f mm — %s',
                    $c['numero_fogo'], $c['veiculo'], $c['posicao'], $c['sulco'], $c['nivel']),
                $criticos
            );
            $corpo = "Empresa: {$company->display_name}\nPneus com sulco abaixo de {$alerta} mm (limite legal {$minimo} mm):\n\n" . implode("\n", $linhas);

            $this->warn("{$company->display_name}: " . count($criticos) . ' pneu(s) crítico(s)');
            $this->line($corpo);

            if ($this->option('dry-run')) {
                return;
            }

            $destinatarios = $this->destinatarios($company);
            if (empty($destinatarios)) {
                $this->error("{$company->display_name}: nenhum destinatário configurado.");
                $falhou = true;
                return;
            }

            try {
                Mail::raw($corpo, function ($mensagem) use ($destinatarios, $company) {
                    $mensagem->to($destinatarios)->subject("[Frota - {$company->display_name}] Pneus com sulco crítico");
                });
                $this->info("{$company->display_name}: email enviado para " . implode(', ', $destinatarios));
            } catch (\Throwable $exception) {
                $this->error("{$company->display_name}: falha ao enviar email: {$exception->getMessage()}");
                $falhou = true;
            }
        });

        if ($encontrados === 0) {
            $this->info('Nenhum pneu com sulco crítico. Nada a enviar.');
        } elseif ($this->option('dry-run')) {
            $this->warn('Modo --dry-run: nenhum email enviado.');
        }

        return $falhou ? self::FAILURE : self::SUCCESS;
    }

    private function criticosDaEmpresa(Company $company, float $alerta, float $minimo): array
    {
        return Pneu::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('situacao', 'montado')
            ->whereNull('deleted_at')
            ->get()
            ->map(function (Pneu $pneu) use ($company, $alerta, $minimo) {
                $inspecao = PneuInspecao::withoutGlobalScopes()
                    ->where('company_id', $company->id)
                    ->where('pneu_id', $pneu->id)
                    ->whereNull('deleted_at')
                    ->orderByDesc('data')
                    ->orderByDesc('id')
                    ->first();
                if ($inspecao?->sulco_mm === null || (float) $inspecao->sulco_mm >= $alerta) {
                    return null;
                }

                $montagem = PneuMontagemAtiva::withoutGlobalScopes()
                    ->where('company_id', $company->id)
                    ->where('pneu_id', $pneu->id)
                    ->first();
                $veiculo = $montagem
                    ? Veiculo::withoutGlobalScopes()
                        ->where('company_id', $company->id)
                        ->find($montagem->veiculo_id)
                    : null;
                $sulco = (float) $inspecao->sulco_mm;
                return [
                    'numero_fogo' => $pneu->numero_fogo,
                    'sulco' => $sulco,
                    'nivel' => $sulco < $minimo ? 'CRÍTICO (abaixo do legal)' : 'atenção',
                    'veiculo' => $veiculo?->prefixo ?? '—',
                    'posicao' => $montagem?->posicao ?? '—',
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    protected function destinatarios(Company $company): array
    {
        if ($email = $this->option('email')) {
            return [$email];
        }

        $destinatarios = $company->users()
            ->whereIn('users.type', ['admin', 'super_admin'])
            ->whereNotNull('users.email')
            ->pluck('users.email')
            ->push($company->email)
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($destinatarios) {
            return $destinatarios;
        }

        return collect((array) config('frota.alertas_email', []))->filter()->unique()->values()->all();
    }
}
