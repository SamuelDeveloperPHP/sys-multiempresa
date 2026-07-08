<?php

namespace Tests\Feature\Mobile;

use App\Models\Frota\VeiculoChecklistServico;
use Illuminate\Support\Facades\Storage;

/**
 * Cobertura server-side do fluxo de checklist do módulo mobile:
 * idempotência por client_uuid, extração de fotos base64, evidência
 * obrigatória na não conformidade, amarração checklist↔veículo,
 * bloqueio de ciclo aberto e escopo multi-tenant.
 */
class ChecklistServicoApiTest extends MobileTestCase
{
    // PNG 1x1 válido — payload mínimo de foto
    private const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function payloadBase(array $c, array $extra = []): array
    {
        return array_merge([
            'client_uuid'  => 'local_' . fake()->uuid(),
            'veiculo_id'   => $c['veiculo']->id,
            'checklist_id' => $c['checklist']->id,
            'data'         => now()->toIso8601String(),
            'tipo'         => 'ABERTURA',
            'ciclo_status' => 'ABERTO',
            'respostas'    => [
                ['item_id' => $c['item']->id, 'item_nome' => 'Farol dianteiro', 'ok' => true],
            ],
        ], $extra);
    }

    public function test_reenvio_com_mesmo_client_uuid_nao_duplica(): void
    {
        $c = $this->cenarioBase();
        $payload = $this->payloadBase($c);

        $r1 = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload);
        $r1->assertStatus(201)->assertJsonPath('status', true);

        // Replay (retry após resposta perdida): devolve o MESMO registro
        $r2 = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload);
        $r2->assertStatus(200)->assertJsonPath('deduplicated', true);

        $this->assertSame($r1->json('data.id'), $r2->json('data.id'));
        $this->assertSame(1, VeiculoChecklistServico::withoutGlobalScopes()
            ->where('client_uuid', $payload['client_uuid'])->count());
    }

    public function test_foto_base64_vira_arquivo_e_json_guarda_somente_o_caminho(): void
    {
        Storage::fake('public');
        $c = $this->cenarioBase();

        $payload = $this->payloadBase($c, [
            'respostas' => [[
                'item_id' => $c['item']->id,
                'ok' => false,
                'obs' => 'Farol trincado',
                'foto_data_url' => self::PNG_1X1,
            ]],
        ]);

        $resp = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload);
        $resp->assertStatus(201);

        // Resposta da API expõe foto_url navegável
        $this->assertStringContainsString('/storage/uploads/aplicativo/checklist_servicos/', (string) $resp->json('data.respostas.0.foto_url'));

        // Banco: JSON tem foto_path e NÃO tem o base64
        $rec = VeiculoChecklistServico::withoutGlobalScopes()->firstOrFail();
        $respostas = $rec->respostas;
        $this->assertArrayHasKey('foto_path', $respostas[0]);
        $this->assertArrayNotHasKey('foto_data_url', $respostas[0]);
        $this->assertStringNotContainsString('base64', json_encode($respostas));

        // Arquivo realmente gravado no disco
        Storage::disk('public')->assertExists($respostas[0]['foto_path']);
    }

    public function test_nao_conformidade_sem_observacao_retorna_422(): void
    {
        $c = $this->cenarioBase();
        $payload = $this->payloadBase($c, [
            'respostas' => [['item_id' => $c['item']->id, 'ok' => false, 'obs' => '']],
        ]);

        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['respostas.0.obs']);
    }

    public function test_checklist_de_outro_veiculo_retorna_422(): void
    {
        $c = $this->cenarioBase();
        $outroVeiculo = $this->criarVeiculo($c['company'], 'VT-99');

        // checklist pertence ao veículo original, não ao outro
        $payload = $this->payloadBase($c, ['veiculo_id' => $outroVeiculo->id]);

        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['checklist_id']);
    }

    public function test_checklist_e_cadastro_unico_sem_bloqueio_de_ciclo(): void
    {
        // REGRA NOVA (gerência, 2026-07-08): checklist não tem mais ciclo.
        // Um registro ABERTO antigo (histórico intocado) NÃO bloqueia nada.
        $c = $this->cenarioBase();
        $veiculoB = $this->criarVeiculo($c['company'], 'VT-02');

        VeiculoChecklistServico::forceCreate([
            'company_id'   => $c['company']->id,
            'id_veiculo'   => $veiculoB->id,
            'id_checklist' => $c['checklist']->id,
            'status_ciclo' => 'ABERTO', // legado — deve ser ignorado
            'id_user'      => $c['user']->id,
            'user_create'  => $c['user']->email,
        ]);

        $resp = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $this->payloadBase($c));

        // Antes: 422 (ciclo aberto em outro veículo). Agora: cadastra normal,
        // e o registro novo nasce concluído (FECHADO), sem ciclo.
        $resp->assertStatus(201)->assertJsonPath('data.ciclo_status', 'FECHADO');
    }

    public function test_cooldown_de_uma_hora_entre_checklists(): void
    {
        $c = $this->cenarioBase();
        $agora = now();

        // 1º checklist do dia → OK
        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $this->payloadBase($c, [
                'data' => $agora->toIso8601String(),
            ]))
            ->assertStatus(201);

        // 2º do MESMO usuário no MESMO veículo 30min depois → 422 (cooldown)
        $resp = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $this->payloadBase($c, [
                'data' => $agora->copy()->addMinutes(30)->toIso8601String(),
            ]));
        $resp->assertStatus(422);
        $this->assertNotNull($resp->json('errors.cooldown'));

        // 3º passadas 2 horas → liberado
        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $this->payloadBase($c, [
                'data' => $agora->copy()->addHours(2)->toIso8601String(),
            ]))
            ->assertStatus(201);

        // OUTRO veículo dentro da mesma hora → liberado (troca de veículo)
        $veiculoB = $this->criarVeiculo($c['company'], 'VT-02');
        [$checklistB, $itemB] = $this->criarChecklist($c['company'], $veiculoB);
        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', [
                'client_uuid'  => 'local_' . fake()->uuid(),
                'veiculo_id'   => $veiculoB->id,
                'checklist_id' => $checklistB->id,
                'data'         => $agora->copy()->addMinutes(10)->toIso8601String(),
                'respostas'    => [['item_id' => $itemB->id, 'ok' => true]],
            ])
            ->assertStatus(201);
    }

    public function test_replay_com_mesmo_client_uuid_nao_cai_no_cooldown(): void
    {
        $c = $this->cenarioBase();
        $payload = $this->payloadBase($c);

        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload)
            ->assertStatus(201);

        // Replay do MESMO create (retry de sync): dedupe vem ANTES do
        // cooldown → devolve o existente em vez de 422
        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/checklist-servicos', $payload)
            ->assertStatus(200)
            ->assertJsonPath('deduplicated', true);
    }

    public function test_checklists_all_escopado_pela_empresa_da_sessao(): void
    {
        $a = $this->cenarioBase(); // empresa A com 1 checklist
        $empresaB = $this->criarEmpresa('Empresa B');
        $veiculoB = $this->criarVeiculo($empresaB, 'VB-01');
        $this->criarChecklist($empresaB, $veiculoB);

        $resp = $this->comContexto($a['user'], $a['company'])
            ->getJson('/api/mobile/checklists');

        $resp->assertOk();
        $ids = collect($resp->json('checklists'))->pluck('company_id')->unique()->values();
        $this->assertSame([$a['company']->id], $ids->all(), 'checklistsAll vazou dados de outra empresa');
    }

    public function test_veiculo_de_outra_empresa_retorna_403(): void
    {
        $a = $this->cenarioBase();
        $empresaB = $this->criarEmpresa('Empresa B');
        $veiculoB = $this->criarVeiculo($empresaB, 'VB-01');

        $this->comContexto($a['user'], $a['company'])
            ->getJson("/api/mobile/veiculos/{$veiculoB->id}/checklists")
            ->assertStatus(403);
    }
}
