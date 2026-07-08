<?php

namespace Tests\Feature\Mobile;

use App\Models\Frota\VeiculoAbastecimento;
use Illuminate\Support\Facades\Storage;

/**
 * Cobertura do fluxo de abastecimento mobile — em especial o bug em que a
 * foto do comprovante (arquivo_app_data_url) era IGNORADA pelo servidor.
 */
class AbastecimentoApiTest extends MobileTestCase
{
    private const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function payloadBase(array $c, array $extra = []): array
    {
        return array_merge([
            'client_uuid' => 'local_' . fake()->uuid(),
            'veiculo_id'  => $c['veiculo']->id,
            'data'        => now()->toIso8601String(),
            'combustivel' => 'Diesel S10',
            'quantidade'  => 45.5,
            'valor_total' => 280.90,
        ], $extra);
    }

    public function test_foto_do_comprovante_e_salva_no_servidor(): void
    {
        Storage::fake('public');
        $c = $this->cenarioBase();

        $resp = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/abastecimentos', $this->payloadBase($c, [
                'arquivo_app_data_url' => self::PNG_1X1,
            ]));

        $resp->assertStatus(201);
        // Resposta expõe a URL do comprovante para o front exibir
        $this->assertStringContainsString('/storage/uploads/aplicativo/abastecimentos/', (string) $resp->json('data.comprovante_url'));

        // Banco: convenção legada — arquivo_app = nome, arquivo_servidor = URL
        $rec = VeiculoAbastecimento::withoutGlobalScopes()->firstOrFail();
        $this->assertNotEmpty($rec->arquivo_app);
        $this->assertStringContainsString('uploads/aplicativo/abastecimentos/', (string) $rec->arquivo_servidor);

        // Arquivo realmente gravado no disco
        Storage::disk('public')->assertExists('uploads/aplicativo/abastecimentos/' . $rec->arquivo_app);
    }

    public function test_abastecimento_sem_foto_continua_funcionando(): void
    {
        $c = $this->cenarioBase();

        $resp = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/abastecimentos', $this->payloadBase($c));

        $resp->assertStatus(201);
        $this->assertNull($resp->json('data.comprovante_url'));
    }

    public function test_reenvio_com_mesmo_client_uuid_nao_duplica(): void
    {
        $c = $this->cenarioBase();
        $payload = $this->payloadBase($c);

        $r1 = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/abastecimentos', $payload);
        $r1->assertStatus(201);

        $r2 = $this->comContexto($c['user'], $c['company'])
            ->postJson('/api/mobile/abastecimentos', $payload);
        $r2->assertStatus(200)->assertJsonPath('deduplicated', true);

        $this->assertSame(1, VeiculoAbastecimento::withoutGlobalScopes()
            ->where('client_uuid', $payload['client_uuid'])->count());
    }
}
