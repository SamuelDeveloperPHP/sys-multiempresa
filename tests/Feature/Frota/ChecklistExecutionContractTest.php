<?php

namespace Tests\Feature\Frota;

use App\Models\Frota\VeiculoChecklist;
use App\Models\Frota\VeiculoChecklistItem;
use App\Models\Frota\VeiculoChecklistRealizado;
use App\Models\Frota\VeiculoChecklistServico;
use App\Services\Frota\ChecklistExecutionContract;
use App\Services\Frota\NormalizarContratoChecklist;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

class ChecklistExecutionContractTest extends AdminFrotaTestCase
{
    public function test_checklist_criado_pela_pwa_aparece_no_admin_e_no_detalhe_canonico(): void
    {
        $company = $this->criarEmpresa();
        $user = $this->criarUsuario($company, 'admin');
        $vehicle = $this->criarVeiculo($company, ['prefixo' => 'PWA-01']);
        [$checklist, $item] = $this->criarChecklist($company->id, $vehicle->id);
        $this->concederPermissao($user, $company, 'admin.frota.checklist-execucoes.index', ['list', 'view']);

        $response = $this->comContexto($user, $company)->postJson('/api/mobile/checklist-servicos', [
            'client_uuid' => fake()->uuid(),
            'veiculo_id' => $vehicle->id,
            'checklist_id' => $checklist->id,
            'data' => now()->toIso8601String(),
            'responsavel' => $user->name,
            'km_atual' => 12345,
            'observacao_geral' => 'Inspeção antes da saída.',
            'respostas' => [[
                'item_id' => $item->id,
                'item_nome' => $item->nome_servico,
                'ok' => false,
                'obs' => 'Lente trincada.',
            ]],
        ]);

        $response->assertCreated()->assertJsonPath('data.status', ChecklistExecutionContract::STATUS_CONCLUIDO);
        $executionId = (int) $response->json('data.id');

        $this->comContexto($user, $company)
            ->get(route('admin.frota.checklist-execucoes.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Frota/ChecklistExecucoes/Index')
                ->has('realizados', 1)
                ->where('realizados.0.execucao_hoje_id', $executionId)
                ->where('realizados.0.dias.6.status', 'concluido')
            );

        $this->comContexto($user, $company)
            ->get(route('admin.frota.checklist-execucoes.show', $executionId))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Frota/ChecklistExecucoes/Show')
                ->where('execucao.status', ChecklistExecutionContract::STATUS_CONCLUIDO)
                ->where('execucao.data', $response->json('data.data'))
                ->where('execucao.respostas.0.item_nome', 'Farol dianteiro')
                ->where('execucao.respostas.0.ok', false)
                ->where('execucao.respostas.0.obs', 'Lente trincada.')
            );

        $execution = VeiculoChecklistServico::withoutGlobalScopes()->findOrFail($executionId);
        $this->assertSame($execution->data_execucao?->toDateTimeString(), $execution->data_cadastro?->toDateTimeString());
    }

    public function test_detalhe_admin_converte_respostas_legadas_sem_duplicar_em_json(): void
    {
        $company = $this->criarEmpresa();
        $user = $this->criarUsuario($company, 'admin');
        $vehicle = $this->criarVeiculo($company);
        [$checklist, $item] = $this->criarChecklist($company->id, $vehicle->id);
        $this->concederPermissao($user, $company, 'admin.frota.checklist-execucoes.index', ['view']);

        $execution = VeiculoChecklistServico::withoutGlobalScopes()->create([
            'company_id' => $company->id,
            'id_veiculo' => $vehicle->id,
            'id_checklist' => $checklist->id,
            'id_local' => 'legacy-'.fake()->uuid(),
            'data_cadastro' => now(),
            'user_create' => $user->email,
            'respostas' => null,
        ]);
        VeiculoChecklistRealizado::withoutGlobalScopes()->create([
            'company_id' => $company->id,
            'id_checklist_realizado' => $execution->id_local,
            'id_checklist_itens' => $item->id,
            'status' => 'nao',
            'observacao' => 'Falha registrada no legado.',
            'arquivo_servidor' => 'https://example.test/evidencia.jpg',
        ]);

        $this->comContexto($user, $company)
            ->get(route('admin.frota.checklist-execucoes.show', $execution))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('execucao.respostas.0.item_nome', 'Farol dianteiro')
                ->where('execucao.respostas.0.ok', false)
                ->where('execucao.respostas.0.foto_url', 'https://example.test/evidencia.jpg')
            );

        $this->assertNull($execution->fresh()->respostas);
    }

    public function test_backfill_tem_dry_run_filtro_por_empresa_e_e_idempotente(): void
    {
        $company = $this->criarEmpresa();
        $otherCompany = $this->criarEmpresa('Outra empresa');
        $vehicle = $this->criarVeiculo($company);
        $otherVehicle = $this->criarVeiculo($otherCompany);

        $legacyId = $this->insertRawExecution($company->id, $vehicle->id, '2026-10-29 08:00:00', null, 'ABERTO');
        $mobileId = $this->insertRawExecution($company->id, $vehicle->id, null, '2026-10-29 09:00:00', 'FECHADO');
        $otherId = $this->insertRawExecution($otherCompany->id, $otherVehicle->id, '2026-10-29 10:00:00', null, 'ABERTO');

        $before = DB::table('veiculo_checklist_itens_servicos')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $this->artisan('frota:normalizar-checklists', ['--company' => $company->id, '--json' => true])
            ->expectsOutputToContain('"dry_run": true')
            ->assertSuccessful();
        $afterDryRun = DB::table('veiculo_checklist_itens_servicos')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $this->assertSame($before, $afterDryRun);

        $this->artisan('frota:normalizar-checklists', ['--company' => $company->id, '--execute' => true, '--json' => true])
            ->expectsOutputToContain('"missing_canonical_date": 0')
            ->assertSuccessful();

        $legacy = DB::table('veiculo_checklist_itens_servicos')->find($legacyId);
        $mobile = DB::table('veiculo_checklist_itens_servicos')->find($mobileId);
        $other = DB::table('veiculo_checklist_itens_servicos')->find($otherId);
        $this->assertSame($legacy->data_cadastro, $legacy->data_execucao);
        $this->assertSame('FECHADO', $legacy->status_ciclo);
        $this->assertSame($mobile->data_execucao, $mobile->data_cadastro);
        $this->assertNull($other->data_execucao, 'O filtro por empresa não pode alterar outro tenant.');
        $this->assertSame('ABERTO', $other->status_ciclo);

        $rerun = app(NormalizarContratoChecklist::class)->execute($company->id);
        $this->assertSame([
            'fromLegacyDate' => 0,
            'fromCreatedAt' => 0,
            'compatibilityDate' => 0,
            'status' => 0,
        ], $rerun['updated']);
    }

    private function criarChecklist(int $companyId, int $vehicleId): array
    {
        $checklist = VeiculoChecklist::withoutGlobalScopes()->create([
            'company_id' => $companyId,
            'id_veiculo' => $vehicleId,
            'nome_checklist' => 'Checklist diário',
            'situacao' => 'Ativo',
        ]);
        $item = VeiculoChecklistItem::withoutGlobalScopes()->create([
            'company_id' => $companyId,
            'id_checklist' => $checklist->id,
            'id_veiculo' => $vehicleId,
            'nome_servico' => 'Farol dianteiro',
            'situacao' => 'Ativo',
        ]);

        return [$checklist, $item];
    }

    private function insertRawExecution(
        int $companyId,
        int $vehicleId,
        ?string $legacyDate,
        ?string $canonicalDate,
        string $status,
    ): int {
        return DB::table('veiculo_checklist_itens_servicos')->insertGetId([
            'company_id' => $companyId,
            'id_veiculo' => $vehicleId,
            'data_cadastro' => $legacyDate,
            'data_execucao' => $canonicalDate,
            'status_ciclo' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
