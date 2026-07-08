<?php

namespace Tests\Feature\Mobile;

use App\Models\Frota\VeiculoDiarioBordo;
use Illuminate\Support\Facades\Storage;

/**
 * Fluxo do Diário de Bordo mobile (ciclo ABERTURA → ENCERRAMENTO).
 *
 * Regressões cobertas (bugs de teste de campo):
 *  - create com 'descricao_atividade' (nome usado pelo PWA) caía em 422
 *    porque a validação só aceitava 'descricao';
 *  - encerramento perdia horario_final, horas_trabalhadas_minutos,
 *    observacao_fechamento e a foto (validação descartava os campos).
 */
class DiarioBordoApiTest extends MobileTestCase
{
    private const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    public function test_abertura_com_campos_do_app_nao_cai_em_422(): void
    {
        Storage::fake('public');
        $c = $this->cenarioBase();

        $resp = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/diario-bordo', [
                'client_uuid'          => 'local_' . fake()->uuid(),
                'veiculo_id'           => $c['veiculo']->id,
                'data'                 => now()->toIso8601String(),
                'horario_inicial'      => now()->toIso8601String(),
                'ciclo_status'         => 'ABERTO',
                'descricao_atividade'  => 'Transporte de material para obra', // nome do PWA
                'km_inicial'           => 12000,
                'arquivo_app_data_url' => self::PNG_1X1,
            ]);

        $resp->assertStatus(201)->assertJsonPath('data.ciclo_status', 'ABERTO');

        $rec = VeiculoDiarioBordo::withoutGlobalScopes()->firstOrFail();
        $this->assertSame('Transporte de material para obra', $rec->descricao_atividade);
        $this->assertNotNull($rec->horario_inicial, 'horario_inicial deve ser persistido');
        $this->assertStringContainsString('uploads/aplicativo/diario_bordo/', (string) $rec->arquivo_servidor);
        Storage::disk('public')->assertExists('uploads/aplicativo/diario_bordo/' . $rec->arquivo_app);
    }

    public function test_abertura_sem_descricao_retorna_422(): void
    {
        $c = $this->cenarioBase();

        $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/diario-bordo', [
                'veiculo_id' => $c['veiculo']->id,
                'data'       => now()->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['descricao']);
    }

    public function test_encerramento_persiste_horas_observacao_e_foto(): void
    {
        Storage::fake('public');
        $c = $this->cenarioBase();

        $aberto = VeiculoDiarioBordo::forceCreate([
            'company_id'      => $c['company']->id,
            'id_veiculo'      => $c['veiculo']->id,
            'id_user'         => $c['user']->id,
            'ciclo_status'    => 'ABERTO',
            'data_cadastro'   => now()->subHours(8),
            'horario_inicial' => now()->subHours(8),
            'descricao_atividade' => 'Turno da manhã',
        ]);

        $resp = $this->comContexto($c['user'], $c['company'])
            ->putJson("/api/mobile/diario-bordo/{$aberto->id}", [
                'ciclo_status'                => 'FECHADO',
                'horario_final'               => now()->toIso8601String(),
                'horas_trabalhadas_minutos'   => 480,
                'km_final'                    => 12180,
                'observacao_fechamento'       => 'Sem intercorrências no turno',
                'arquivo_fechamento_data_url' => self::PNG_1X1,
            ]);

        $resp->assertOk()
            ->assertJsonPath('data.ciclo_status', 'FECHADO')
            ->assertJsonPath('data.horas_trabalhadas_minutos', 480);

        $rec = $aberto->fresh();
        $this->assertSame('FECHADO', $rec->ciclo_status);
        $this->assertNotNull($rec->horario_final, 'horario_final deve ser persistido');
        $this->assertSame(480, (int) $rec->horas_trabalhadas_minutos);
        $this->assertSame('Sem intercorrências no turno', $rec->descricao_encerramento);
        // Foto do fechamento em coluna própria — sem sobrescrever a da abertura
        $this->assertStringContainsString('uploads/aplicativo/diario_bordo/', (string) $rec->arquivo_fechamento_servidor);
        Storage::disk('public')->assertExists('uploads/aplicativo/diario_bordo/' . $rec->arquivo_fechamento_app);
        $this->assertStringContainsString('diario_fech_', (string) $rec->arquivo_fechamento_app);
    }
}
