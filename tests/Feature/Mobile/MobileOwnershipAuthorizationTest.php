<?php

namespace Tests\Feature\Mobile;

use App\Models\AuditLog;
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Frota\VeiculoDiarioBordo;

class MobileOwnershipAuthorizationTest extends MobileTestCase
{
    public function test_outro_operador_nao_pode_atualizar_nem_excluir_recursos_da_mesma_empresa(): void
    {
        $c = $this->cenarioBase();
        $outroOperador = $this->criarUsuario($c['company']);
        [$abastecimento, $diario, $checklist] = $this->criarRegistrosDoAutor($c);

        $this->comContexto($outroOperador, $c['company'])
            ->putJson("/api/mobile/abastecimentos/{$abastecimento->id}", ['quantidade' => 99])
            ->assertForbidden();
        $this->comContexto($outroOperador, $c['company'])
            ->deleteJson("/api/mobile/abastecimentos/{$abastecimento->id}")
            ->assertForbidden();

        $this->comContexto($outroOperador, $c['company'])
            ->putJson("/api/mobile/diario-bordo/{$diario->id}", ['descricao' => 'Alteração indevida'])
            ->assertForbidden();
        $this->comContexto($outroOperador, $c['company'])
            ->deleteJson("/api/mobile/diario-bordo/{$diario->id}")
            ->assertForbidden();

        $this->comContexto($outroOperador, $c['company'])
            ->putJson("/api/mobile/checklist-servicos/{$checklist->id}", ['observacao_geral' => 'Alteração indevida'])
            ->assertForbidden();
        $this->comContexto($outroOperador, $c['company'])
            ->deleteJson("/api/mobile/checklist-servicos/{$checklist->id}")
            ->assertForbidden();

        $this->assertSame('10.00', $abastecimento->fresh()->quantidade);
        $this->assertSame('Registro original', $diario->fresh()->descricao_atividade);
        $this->assertSame('Registro original', $checklist->fresh()->observacao_geral);
        $this->assertNull($abastecimento->fresh()->deleted_at);
        $this->assertNull($diario->fresh()->deleted_at);
        $this->assertNull($checklist->fresh()->deleted_at);
        $this->assertSame(0, AuditLog::withoutGlobalScopes()->count());
    }

    public function test_tipo_admin_sem_permissao_explicita_nao_ignora_autoria(): void
    {
        $c = $this->cenarioBase();
        $admin = $this->criarUsuario($c['company'], 'admin');
        [$abastecimento] = $this->criarRegistrosDoAutor($c);

        $this->comContexto($admin, $c['company'])
            ->deleteJson("/api/mobile/abastecimentos/{$abastecimento->id}")
            ->assertForbidden();

        $this->assertNull($abastecimento->fresh()->deleted_at);
    }

    public function test_gestor_com_permissao_explicita_pode_mutar_e_gera_auditoria(): void
    {
        $c = $this->cenarioBase();
        $gestor = $this->criarUsuario($c['company'], 'manager');
        [, $diario, $checklist] = $this->criarRegistrosDoAutor($c);
        $this->concederPermissao($gestor, $c['company'], 'frota.diario', 'edit');
        $this->concederPermissao($gestor, $c['company'], 'frota.checklist-execucoes', 'delete');

        $this->comContexto($gestor, $c['company'])
            ->putJson("/api/mobile/diario-bordo/{$diario->id}", ['descricao' => 'Correção gerencial auditada'])
            ->assertOk();
        $this->comContexto($gestor, $c['company'])
            ->deleteJson("/api/mobile/checklist-servicos/{$checklist->id}")
            ->assertOk();

        $this->assertSame('Correção gerencial auditada', $diario->fresh()->descricao_atividade);
        $this->assertNotNull($checklist->fresh()->deleted_at);

        $updateAudit = AuditLog::withoutGlobalScopes()
            ->where('action', 'mobile_ownership_override_update')
            ->where('model_type', VeiculoDiarioBordo::class)
            ->firstOrFail();
        $this->assertSame($gestor->id, $updateAudit->user_id);
        $this->assertSame($c['company']->id, $updateAudit->company_id);
        $this->assertSame('Registro original', $updateAudit->before['descricao_atividade']);
        $this->assertSame('Correção gerencial auditada', $updateAudit->after['descricao_atividade']);

        $deleteAudit = AuditLog::withoutGlobalScopes()
            ->where('action', 'mobile_ownership_override_delete')
            ->where('model_type', VeiculoChecklistServico::class)
            ->firstOrFail();
        $this->assertSame($gestor->id, $deleteAudit->user_id);
        $this->assertNotNull($deleteAudit->after['deleted_at']);
    }

    public function test_autor_pode_atualizar_e_excluir_os_proprios_recursos(): void
    {
        $c = $this->cenarioBase();
        [$abastecimento, $diario, $checklist] = $this->criarRegistrosDoAutor($c);

        $this->comContexto($c['user'], $c['company'])
            ->putJson("/api/mobile/abastecimentos/{$abastecimento->id}", ['quantidade' => 12])
            ->assertOk();
        $this->comContexto($c['user'], $c['company'])
            ->putJson("/api/mobile/diario-bordo/{$diario->id}", ['descricao' => 'Edição do autor'])
            ->assertOk();
        $this->comContexto($c['user'], $c['company'])
            ->putJson("/api/mobile/checklist-servicos/{$checklist->id}", ['observacao_geral' => 'Edição do autor'])
            ->assertOk();

        $this->comContexto($c['user'], $c['company'])
            ->deleteJson("/api/mobile/abastecimentos/{$abastecimento->id}")
            ->assertOk();
        $this->comContexto($c['user'], $c['company'])
            ->deleteJson("/api/mobile/diario-bordo/{$diario->id}")
            ->assertOk();
        $this->comContexto($c['user'], $c['company'])
            ->deleteJson("/api/mobile/checklist-servicos/{$checklist->id}")
            ->assertOk();

        $this->assertNotNull($abastecimento->fresh()->deleted_at);
        $this->assertNotNull($diario->fresh()->deleted_at);
        $this->assertNotNull($checklist->fresh()->deleted_at);
        $this->assertSame(0, AuditLog::withoutGlobalScopes()->count());
    }

    public function test_recurso_de_outra_empresa_permanece_invisivel(): void
    {
        $a = $this->cenarioBase();
        $empresaB = $this->criarEmpresa('Empresa B');
        $autorB = $this->criarUsuario($empresaB);
        $veiculoB = $this->criarVeiculo($empresaB, 'VB-01');
        $registroB = VeiculoAbastecimento::forceCreate([
            'company_id' => $empresaB->id,
            'veiculo_id' => $veiculoB->id,
            'user_create' => $autorB->email,
            'quantidade' => 10,
            'valor_total' => 50,
        ]);

        $this->comContexto($a['user'], $a['company'])
            ->deleteJson("/api/mobile/abastecimentos/{$registroB->id}")
            ->assertNotFound();

        $this->assertNull($registroB->fresh()->deleted_at);
    }

    private function criarRegistrosDoAutor(array $c): array
    {
        $abastecimento = VeiculoAbastecimento::forceCreate([
            'company_id' => $c['company']->id,
            'veiculo_id' => $c['veiculo']->id,
            'user_create' => $c['user']->email,
            'quantidade' => 10,
            'valor_total' => 50,
        ]);
        $diario = VeiculoDiarioBordo::forceCreate([
            'company_id' => $c['company']->id,
            'id_veiculo' => $c['veiculo']->id,
            'id_user' => $c['user']->id,
            'user_create' => $c['user']->email,
            'descricao_atividade' => 'Registro original',
            'ciclo_status' => 'ABERTO',
        ]);
        $checklist = VeiculoChecklistServico::forceCreate([
            'company_id' => $c['company']->id,
            'id_veiculo' => $c['veiculo']->id,
            'id_checklist' => $c['checklist']->id,
            'id_user' => $c['user']->id,
            'user_create' => $c['user']->email,
            'observacao_geral' => 'Registro original',
        ]);

        return [$abastecimento, $diario, $checklist];
    }
}
