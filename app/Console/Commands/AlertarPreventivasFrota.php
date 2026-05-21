<?php

namespace App\Console\Commands;

use App\Mail\AlertaPreventivasFrota;
use App\Models\Frota\Veiculo;
use App\Models\User;
use App\Services\Frota\CalculadorCiclosPreventiva;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Varre todos os veiculos ativos da empresa e identifica ciclos de preventiva
 * vencidos ou prontos para executar. Envia 1 email consolidado.
 *
 * Uso:
 *   php artisan frota:alertar-preventivas             # roda no modo normal
 *   php artisan frota:alertar-preventivas --dry-run   # so mostra o que seria enviado
 *   php artisan frota:alertar-preventivas --email=foo@bar.com  # override destinatario
 *   php artisan frota:alertar-preventivas --company=1
 */
class AlertarPreventivasFrota extends Command
{
    protected $signature = 'frota:alertar-preventivas
                            {--dry-run : Nao envia email, so mostra o resumo}
                            {--email= : Destinatario unico (override do config)}
                            {--company= : Filtra so uma empresa (default: todas)}';

    protected $description = 'Verifica ciclos vencidos/proximos do vencimento e envia email de alerta';

    public function handle(CalculadorCiclosPreventiva $calc): int
    {
        $companyFiltro = $this->option('company');

        $query = Veiculo::withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->where('situacao', 'Ativo');

        if ($companyFiltro) {
            $query->where('company_id', (int) $companyFiltro);
        }

        $veiculos = $query->with('obra:id,nome_fantasia,code')->get();
        $this->info("Analisando {$veiculos->count()} veiculo(s)...");

        $resumo = [];
        foreach ($veiculos as $v) {
            $criticos = $calc->ciclosCriticos($v);

            if (config('frota.incluir_aguardando_no_email')) {
                $dash = $calc->montar($v);
                $criticos = $dash['ciclos']; // tudo
            }

            if (empty($criticos)) continue;

            $resumo[] = [
                'veiculo' => $v,
                'ciclos'  => $criticos,
            ];
        }

        if (empty($resumo)) {
            $this->info('Nenhum veiculo com ciclo critico. Nada a enviar.');
            return self::SUCCESS;
        }

        $this->info(count($resumo) . ' veiculo(s) com ciclos criticos identificados.');

        $destinatarios = $this->destinatarios();
        if (empty($destinatarios)) {
            $this->error('Nenhum destinatario configurado. Defina FROTA_ALERTAS_EMAIL no .env ou use --email=');
            return self::FAILURE;
        }

        $this->info('Destinatarios: ' . implode(', ', $destinatarios));

        if ($this->option('dry-run')) {
            $this->warn('Modo --dry-run: nenhum email sera enviado.');
            foreach ($resumo as $item) {
                $this->line("  {$item['veiculo']->prefixo} ({$item['veiculo']->placa}) — " . count($item['ciclos']) . ' ciclo(s)');
                foreach ($item['ciclos'] as $c) {
                    $this->line("    - Ciclo {$c['periodo']}: {$c['estado']} ({$c['bloqueio']})");
                }
            }
            return self::SUCCESS;
        }

        try {
            Mail::to($destinatarios)->send(new AlertaPreventivasFrota($resumo));
            $this->info('Email enviado com sucesso.');
        } catch (\Throwable $e) {
            $this->error('Falha ao enviar email: ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    protected function destinatarios(): array
    {
        if ($email = $this->option('email')) {
            return [$email];
        }

        $configurados = config('frota.alertas_email', []);
        if (!empty($configurados)) {
            return $configurados;
        }

        // Fallback: primeiro super_admin
        $superAdmin = User::where('type', 'super_admin')->first();
        return $superAdmin?->email ? [$superAdmin->email] : [];
    }
}
