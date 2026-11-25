<?php

namespace Tests\Feature\Frota;

use App\Helpers\CompanyContext;
use App\Models\Company;
use App\Models\Frota\Pneu;
use App\Services\Frota\PneuOperationService;
use App\Console\Commands\AlertarPneusFrota;
use Illuminate\Support\Facades\Artisan;

class PneuAlertIsolationTest extends AdminFrotaTestCase
{
    public function test_dry_run_separa_pneus_criticos_por_empresa(): void
    {
        $primeira = $this->criarEmpresa('Empresa Alfa');
        $segunda = $this->criarEmpresa('Empresa Beta');
        $this->criarCritico($primeira, 'ALFA-CRITICO');
        $this->criarCritico($segunda, 'BETA-CRITICO');
        $this->assertDatabaseHas('pneus', ['company_id' => $primeira->id, 'numero_fogo' => 'ALFA-CRITICO', 'situacao' => 'montado']);
        $this->assertDatabaseHas('pneu_montagens_ativas', ['company_id' => $primeira->id, 'posicao' => '1E']);
        $this->assertDatabaseHas('pneu_inspecoes', ['company_id' => $primeira->id, 'sulco_mm' => 1.2]);

        $metodo = new \ReflectionMethod(AlertarPneusFrota::class, 'criticosDaEmpresa');
        $this->assertCount(1, $metodo->invoke(app(AlertarPneusFrota::class), $primeira, 3.0, 1.6));
        $this->assertCount(1, $metodo->invoke(app(AlertarPneusFrota::class), $segunda, 3.0, 1.6));

        $codigo = Artisan::call('frota:alertar-pneus', ['--dry-run' => true]);
        $saida = Artisan::output();

        $this->assertSame(0, $codigo);
        $inicioAlfa = strpos($saida, 'Empresa: Empresa Alfa');
        $inicioBeta = strpos($saida, 'Empresa: Empresa Beta');
        $this->assertNotFalse($inicioAlfa, $saida);
        $this->assertNotFalse($inicioBeta, $saida);
        $this->assertLessThan($inicioBeta, $inicioAlfa);

        $secaoAlfa = substr($saida, $inicioAlfa, $inicioBeta - $inicioAlfa);
        $secaoBeta = substr($saida, $inicioBeta);
        $this->assertStringContainsString('ALFA-CRITICO', $secaoAlfa);
        $this->assertStringNotContainsString('BETA-CRITICO', $secaoAlfa);
        $this->assertStringContainsString('BETA-CRITICO', $secaoBeta);
        $this->assertStringNotContainsString('ALFA-CRITICO', $secaoBeta);
    }

    private function criarCritico(Company $company, string $numero): void
    {
        CompanyContext::set($company);
        $veiculo = $this->criarVeiculo($company, ['config_pneus' => 'passeio_4x2']);
        $pneu = Pneu::withoutGlobalScopes()->create([
            'company_id' => $company->id,
            'numero_fogo' => $numero,
            'situacao' => 'estoque',
            'vida_atual' => 0,
        ]);
        $operacoes = app(PneuOperationService::class);
        $operacoes->montar($veiculo, $pneu->id, '1E', '2026-11-24', 1000, null);
        $operacoes->inspecionar($pneu, [
            'data' => '2026-11-24',
            'sulco_mm' => 1.2,
            'pressao_psi' => 100,
            'medicao' => 1000,
        ], null);
    }
}
