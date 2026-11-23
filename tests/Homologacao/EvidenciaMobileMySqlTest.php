<?php

namespace Tests\Homologacao;

use App\Models\Frota\VeiculoAbastecimento;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Frota\AdminFrotaTestCase;

class EvidenciaMobileMySqlTest extends AdminFrotaTestCase
{
    public function test_cadastro_de_modulo_preserva_permissao_revogada(): void
    {
        $empresa = $this->criarEmpresa();
        $usuario = $this->criarUsuario($empresa, 'super_admin');
        \App\Models\Module::firstOrCreate(['slug' => 'frota'], ['name' => 'Frota', 'is_active' => true]);
        $this->seed(\Database\Seeders\FrotaChecklistExecucoesModuleSeeder::class);
        $this->assertDatabaseMissing('module_permissions', ['user_id' => $usuario->id]);
        $module = \App\Models\Module::where('slug', 'frota.checklist-execucoes')->firstOrFail();
        $grant = $usuario->modulePermissions()->create(['company_id' => $empresa->id, 'module_id' => $module->id,
            'can_list' => true, 'can_edit' => false]);
        $this->seed(\Database\Seeders\FrotaChecklistExecucoesModuleSeeder::class);
        $this->assertDatabaseHas('module_permissions', ['id' => $grant->id, 'can_list' => 1, 'can_edit' => 0]);
    }

    public function test_comprovante_privado_respeita_autor_empresa_e_reenvio(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        Storage::fake('local');
        Storage::fake('public');
        $empresa = $this->criarEmpresa();
        $outra = $this->criarEmpresa();
        $autor = $this->criarUsuario($empresa, 'motorista');
        $colega = $this->criarUsuario($empresa, 'motorista');
        $autor->companies()->attach($outra->id);
        $veiculo = $this->criarVeiculo($empresa);
        $contexto = $autor->id.':'.$empresa->id;
        $payload = [
            'client_uuid' => 'teste-foto-privada', 'veiculo_id' => $veiculo->id,
            'data' => '2026-11-23', 'combustivel' => 'Diesel', 'quantidade' => 2, 'valor_total' => 10,
            'arquivo_app_data_url' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        ];
        $this->comContexto($autor, $outra)->postJson('/api/mobile/abastecimentos', $payload, ['X-Mobile-Context' => $contexto])
            ->assertConflict();
        $this->assertDatabaseCount('veiculo_abastecimentos', 0);
        $this->comContexto($autor, $empresa)->postJson('/api/mobile/abastecimentos', $payload)->assertForbidden();
        $grant = $this->concederPermissao($autor, $empresa, 'admin.frota.abastecimentos.index', ['create']);
        $grant->module->update(['slug' => 'frota.abastecimentos']);
        $res = $this->comContexto($autor, $empresa)->postJson('/api/mobile/abastecimentos', $payload, ['X-Mobile-Context' => $contexto])
            ->assertCreated();
        $url = $res->json('data.comprovante_url');
        $this->get($url)->assertNotFound();
        $this->getJson('/api/mobile/abastecimentos')->assertForbidden();
        $grant->update(['can_view' => true]);
        $this->getJson('/api/mobile/permissions')->assertOk()->assertJsonFragment(['slug' => 'frota.abastecimentos', 'can_view' => true]);
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->postJson('/api/mobile/abastecimentos', $payload)->assertOk()->assertJsonPath('deduplicated', true);
        $this->assertCount(1, Storage::disk('local')->allFiles());
        $this->assertCount(0, Storage::disk('public')->allFiles());
        $this->comContexto($colega, $empresa)->get($url)->assertNotFound();
        $this->postJson('/api/mobile/abastecimentos', $payload)->assertForbidden();
        $this->comContexto($this->criarUsuario($empresa, 'super_admin'), $empresa)->get($url)->assertNotFound();
        $grant->update(['can_view' => false, 'can_create' => false]);
        $this->comContexto($autor, $empresa)->get($url)->assertNotFound();
        $this->getJson('/api/mobile/permissions')->assertOk()->assertJsonFragment(['can_view' => false]);
        $this->postJson('/api/mobile/abastecimentos', array_merge($payload, ['client_uuid' => 'pendente-antes-da-revogacao']), ['X-Mobile-Context' => $contexto])->assertForbidden();
        $this->assertDatabaseCount('veiculo_abastecimentos', 1);
        $grant->update(['can_view' => true]);
        $this->comContexto($autor, $outra)->get($url)->assertNotFound();
        $this->comContexto($autor, $empresa);
        $registro = VeiculoAbastecimento::firstOrFail();
        $obra = \App\Models\Obra::create(['company_id' => $empresa->id, 'nome_fantasia' => 'Obra restrita']);
        $registro->update(['id_obra' => $obra->id]);
        $this->get($url)->assertNotFound();
        $autor->obras()->attach($obra->id);
        $this->get($url)->assertOk();
        $registro->delete();
        $this->get($url)->assertNotFound();
    }
}
