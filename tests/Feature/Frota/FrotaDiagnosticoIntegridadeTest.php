<?php

namespace Tests\Feature\Frota;

use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Frota\VeiculoDiarioBordo;
use App\Models\Frota\VeiculoLocacao;
use App\Services\Frota\DiagnosticoIntegridadeFrota;
use Illuminate\Support\Facades\DB;

class FrotaDiagnosticoIntegridadeTest extends AdminFrotaTestCase
{
    public function test_diagnostico_encontra_inconsistencias_por_empresa_sem_alterar_dados(): void
    {
        $empresa = $this->criarEmpresa();
        $outraEmpresa = $this->criarEmpresa('Outra Empresa');
        $usuario = $this->criarUsuario($empresa);
        $veiculo = $this->criarVeiculo($empresa);
        $outroVeiculo = $this->criarVeiculo($outraEmpresa);

        $locacoes = collect([
            VeiculoLocacao::withoutGlobalScopes()->create([
                'company_id' => $empresa->id,
                'veiculo_id' => $veiculo->id,
                'data_inicio' => '2026-10-01',
            ]),
            VeiculoLocacao::withoutGlobalScopes()->create([
                'company_id' => $empresa->id,
                'veiculo_id' => $veiculo->id,
                'data_inicio' => '2026-10-02',
            ]),
        ]);

        VeiculoLocacao::withoutGlobalScopes()->create([
            'company_id' => $empresa->id,
            'veiculo_id' => $veiculo->id,
            'data_inicio' => '2026-09-01',
            'data_fim' => '2026-09-30',
        ]);

        VeiculoLocacao::withoutGlobalScopes()->create([
            'company_id' => $outraEmpresa->id,
            'veiculo_id' => $outroVeiculo->id,
            'data_inicio' => '2026-10-01',
        ]);

        $diarios = collect([
            $this->criarDiarioAberto($empresa->id, $veiculo->id, $usuario->id),
            $this->criarDiarioAberto($empresa->id, $veiculo->id, $usuario->id),
        ]);

        VeiculoDiarioBordo::withoutGlobalScopes()->create([
            'company_id' => $empresa->id,
            'id_veiculo' => $veiculo->id,
            'id_user' => $usuario->id,
            'ciclo_status' => 'FECHADO',
        ]);

        $checklistInvisivel = VeiculoChecklistServico::withoutGlobalScopes()->create([
            'company_id' => $empresa->id,
            'id_veiculo' => $veiculo->id,
            'id_user' => $usuario->id,
            'data_execucao' => '2026-10-29 08:00:00',
            'data_cadastro' => null,
        ]);

        VeiculoChecklistServico::withoutGlobalScopes()->create([
            'company_id' => $empresa->id,
            'id_veiculo' => $veiculo->id,
            'id_user' => $usuario->id,
            'data_execucao' => '2026-10-29 09:00:00',
            'data_cadastro' => '2026-10-29 09:00:00',
        ]);

        $antes = $this->snapshot();
        $resultado = app(DiagnosticoIntegridadeFrota::class)->executar($empresa->id);
        $depois = $this->snapshot();

        $this->assertSame($antes, $depois, 'O diagnóstico não pode alterar o banco.');
        $this->assertSame(3, $resultado['summary']['checks_with_issues']);
        $this->assertSame(3, $resultado['summary']['total_issue_groups']);
        $this->assertSame(5, $resultado['summary']['total_affected_records']);

        $locacaoCheck = $resultado['checks']['veiculos_com_multiplas_locacoes_ativas'];
        $this->assertSame(1, $locacaoCheck['issue_count']);
        $this->assertSame($locacoes->pluck('id')->sort()->values()->all(), $locacaoCheck['records'][0]['locacao_ids']);

        $diarioCheck = $resultado['checks']['motoristas_com_multiplos_diarios_abertos'];
        $this->assertSame($diarios->pluck('id')->sort()->values()->all(), $diarioCheck['records'][0]['diario_ids']);

        $checklistCheck = $resultado['checks']['checklists_invisiveis_no_admin'];
        $this->assertSame($checklistInvisivel->id, $checklistCheck['records'][0]['id']);
    }

    public function test_comando_pode_emitir_json_e_falhar_no_ci_quando_ha_inconsistencia(): void
    {
        $empresa = $this->criarEmpresa();
        $veiculo = $this->criarVeiculo($empresa);

        foreach (['2026-10-01', '2026-10-02'] as $data) {
            VeiculoLocacao::withoutGlobalScopes()->create([
                'company_id' => $empresa->id,
                'veiculo_id' => $veiculo->id,
                'data_inicio' => $data,
            ]);
        }

        $this->artisan('frota:diagnosticar-integridade', [
            '--company' => $empresa->id,
            '--json' => true,
            '--fail-on-issues' => true,
        ])
            ->expectsOutputToContain('veiculos_com_multiplas_locacoes_ativas')
            ->assertExitCode(1);
    }

    private function criarDiarioAberto(int $companyId, int $veiculoId, int $userId): VeiculoDiarioBordo
    {
        return VeiculoDiarioBordo::withoutGlobalScopes()->create([
            'company_id' => $companyId,
            'id_veiculo' => $veiculoId,
            'id_user' => $userId,
            'ciclo_status' => 'ABERTO',
        ]);
    }

    private function snapshot(): array
    {
        return [
            'locacoes' => DB::table('veiculos_locacaos')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all(),
            'diarios' => DB::table('veiculos_diario_bordo')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all(),
            'checklists' => DB::table('veiculo_checklist_itens_servicos')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all(),
        ];
    }
}
