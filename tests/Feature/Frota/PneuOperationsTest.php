<?php

namespace Tests\Feature\Frota;

use App\Helpers\CompanyContext;
use App\Models\Company;
use App\Models\Frota\Pneu;
use App\Models\Frota\PneuMovimentacao;
use App\Models\Frota\Veiculo;
use App\Services\Frota\PneuOperationService;
use DomainException;

class PneuOperationsTest extends AdminFrotaTestCase
{
    private Company $company;
    private Veiculo $veiculo;
    private PneuOperationService $operacoes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = $this->criarEmpresa();
        CompanyContext::set($this->company);
        $this->veiculo = $this->criarVeiculo($this->company, ['config_pneus' => 'passeio_4x2']);
        $this->operacoes = app(PneuOperationService::class);
    }

    public function test_montagem_reserva_pneu_e_posicao_de_forma_consistente(): void
    {
        $pneu = $this->pneu('FOGO-001');

        $this->operacoes->montar($this->veiculo, $pneu->id, '1E', '2026-11-24', 1000, 'teste@example.com');

        $this->assertDatabaseHas('pneu_montagens_ativas', [
            'company_id' => $this->company->id,
            'pneu_id' => $pneu->id,
            'veiculo_id' => $this->veiculo->id,
            'posicao' => '1E',
        ]);
        $this->assertDatabaseHas('pneu_movimentacoes', [
            'pneu_id' => $pneu->id,
            'tipo' => 'montagem',
            'posicao' => '1E',
        ]);
        $this->assertSame('montado', $pneu->fresh()->situacao);
    }

    public function test_impede_dois_pneus_na_mesma_posicao(): void
    {
        $primeiro = $this->pneu('FOGO-002');
        $segundo = $this->pneu('FOGO-003');
        $this->operacoes->montar($this->veiculo, $primeiro->id, '1E', '2026-11-24', null, null);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('posição já está ocupada');
        $this->operacoes->montar($this->veiculo, $segundo->id, '1E', '2026-11-24', null, null);
    }

    public function test_impede_posicao_fora_do_layout_e_pneu_de_outra_empresa(): void
    {
        $pneu = $this->pneu('FOGO-004');

        try {
            $this->operacoes->montar($this->veiculo, $pneu->id, '9X', '2026-11-24', null, null);
            $this->fail('A posição inválida deveria ter sido rejeitada.');
        } catch (DomainException $exception) {
            $this->assertStringContainsString('não existe no layout', $exception->getMessage());
        }

        $outraEmpresa = $this->criarEmpresa('Outra Empresa');
        $pneuExterno = Pneu::withoutGlobalScopes()->create([
            'company_id' => $outraEmpresa->id,
            'numero_fogo' => 'FOGO-EXTERNO',
            'situacao' => 'estoque',
        ]);

        $this->expectException(DomainException::class);
        $this->operacoes->montar($this->veiculo, $pneuExterno->id, '1D', '2026-11-24', null, null);
    }

    public function test_troca_e_rodizio_atualizam_reserva_e_historico_na_mesma_operacao(): void
    {
        $saindo = $this->pneu('FOGO-005');
        $entrando = $this->pneu('FOGO-006');
        $this->operacoes->montar($this->veiculo, $saindo->id, '1E', '2026-11-20', 900, null);
        $this->operacoes->rodiziar($this->veiculo, $saindo->id, '1D', '2026-11-22', 950, null);

        [$numeroSaindo, $numeroEntrando] = $this->operacoes->trocar(
            $this->veiculo,
            $entrando->id,
            '1D',
            '2026-11-24',
            1000,
            'conserto',
            'Troca preventiva',
            null,
        );

        $this->assertSame(['FOGO-005', 'FOGO-006'], [$numeroSaindo, $numeroEntrando]);
        $this->assertSame('conserto', $saindo->fresh()->situacao);
        $this->assertSame('montado', $entrando->fresh()->situacao);
        $this->assertDatabaseMissing('pneu_montagens_ativas', ['pneu_id' => $saindo->id]);
        $this->assertDatabaseHas('pneu_montagens_ativas', ['pneu_id' => $entrando->id, 'posicao' => '1D']);
        $this->assertSame(1, PneuMovimentacao::where('pneu_id', $entrando->id)->count());
    }

    public function test_inspecao_registra_automaticamente_veiculo_e_posicao_ativos(): void
    {
        $pneu = $this->pneu('FOGO-007');
        $this->operacoes->montar($this->veiculo, $pneu->id, '2E', '2026-11-24', 1000, null);

        $this->operacoes->inspecionar($pneu, [
            'data' => '2026-11-24',
            'sulco_mm' => 2.4,
            'pressao_psi' => 100,
            'medicao' => 1010,
        ], 'inspetor@example.com');

        $this->assertDatabaseHas('pneu_inspecoes', [
            'company_id' => $this->company->id,
            'pneu_id' => $pneu->id,
            'veiculo_id' => $this->veiculo->id,
            'posicao' => '2E',
            'medicao' => 1010,
        ]);
    }

    public function test_banco_impede_numero_de_fogo_repetido_na_mesma_empresa(): void
    {
        $this->pneu('FOGO-008');

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->pneu('FOGO-008');
    }

    public function test_ciclo_recapagem_conserto_e_sucata_respeita_as_transicoes(): void
    {
        $pneu = $this->pneu('FOGO-009');
        $this->operacoes->montar($this->veiculo, $pneu->id, '1E', '2026-11-20', 1000, null);
        $this->operacoes->desmontar($this->veiculo, $pneu->id, '2026-11-21', 1100, 'recapadora', null, null);

        $vida = $this->operacoes->recapar($pneu, ['data' => '2026-11-22', 'valor' => 500], null);
        $this->assertSame(1, $vida);
        $this->assertSame('estoque', $pneu->fresh()->situacao);

        $this->operacoes->montar($this->veiculo, $pneu->id, '1D', '2026-11-23', 1200, null);
        $this->operacoes->desmontar($this->veiculo, $pneu->id, '2026-11-23', 1250, 'conserto', null, null);
        $this->operacoes->consertar($pneu, ['data' => '2026-11-24', 'valor' => 80], null);
        $this->assertSame('estoque', $pneu->fresh()->situacao);

        $this->operacoes->sucatear($pneu, ['data' => '2026-11-24', 'observacao' => 'Fim de vida'], null);
        $this->assertSame('sucata', $pneu->fresh()->situacao);

        $this->expectException(DomainException::class);
        $this->operacoes->montar($this->veiculo, $pneu->id, '2E', '2026-11-24', null, null);
    }

    private function pneu(string $numero): Pneu
    {
        return Pneu::withoutGlobalScopes()->create([
            'company_id' => $this->company->id,
            'numero_fogo' => $numero,
            'situacao' => 'estoque',
            'vida_atual' => 0,
        ]);
    }
}
