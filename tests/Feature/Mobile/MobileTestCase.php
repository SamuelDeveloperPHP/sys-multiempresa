<?php

namespace Tests\Feature\Mobile;

use App\Models\Company;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoChecklist;
use App\Models\Frota\VeiculoChecklistItem;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Base dos testes da API mobile.
 *
 * IMPORTANTE: as migrations do projeto não rodam em sqlite (a suíte com
 * RefreshDatabase quebra no migrate:fresh). Por isso este TestCase cria
 * APENAS o schema mínimo que os endpoints mobile tocam, direto no sqlite
 * :memory: do phpunit.xml — rápido, isolado e sem riscos ao banco real.
 */
abstract class MobileTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->criarSchemaMinimo();
    }

    private function criarSchemaMinimo(): void
    {
        foreach ([
            'users', 'companies', 'veiculos',
            'veiculo_checklist', 'veiculo_checklist_itens',
            'veiculo_checklist_itens_servicos', 'veiculos_diario_bordo',
            'veiculo_abastecimentos',
            'modules', 'module_permissions',
        ] as $tabela) {
            Schema::dropIfExists($tabela);
        }

        // Consultadas pelo HandleInertiaRequests (menu) em TODO request —
        // vazias bastam para os testes da API mobile.
        Schema::create('modules', function (Blueprint $t) {
            $t->id();
            $t->string('name')->nullable();
            $t->unsignedBigInteger('parent_id')->nullable();
            $t->integer('sort_order')->nullable();
            $t->boolean('is_active')->default(true);
            $t->boolean('show_in_menu')->default(true);
            $t->timestamps();
        });
        Schema::create('module_permissions', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('module_id')->nullable();
            $t->unsignedBigInteger('user_id')->nullable();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->boolean('can_list')->default(false);
            $t->timestamps();
        });

        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('name')->nullable();
            $t->string('email')->nullable();
            $t->timestamp('email_verified_at')->nullable();
            $t->string('password')->nullable();
            $t->string('type')->nullable();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('companies', function (Blueprint $t) {
            $t->id();
            $t->string('name')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->unsignedBigInteger('obra_id')->nullable();
            $t->string('prefixo')->nullable();
            $t->string('placa')->nullable();
            $t->string('marca')->nullable();
            $t->string('modelo')->nullable();
            $t->string('imagem')->nullable();
            $t->string('tipo')->nullable();
            $t->integer('tipo_km')->nullable();
            $t->integer('tipo_hr')->nullable();
            $t->decimal('quilometragem_inicial', 12, 2)->nullable();
            $t->decimal('horimetro_inicial', 12, 2)->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculo_checklist', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->unsignedBigInteger('id_veiculo')->nullable();
            $t->string('nome_checklist')->nullable();
            $t->string('situacao')->nullable();
            $t->string('user_create')->nullable();
            $t->string('user_edit')->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->string('sync_status')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculo_checklist_itens', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->unsignedBigInteger('id_checklist')->nullable();
            $t->unsignedBigInteger('id_veiculo')->nullable();
            $t->string('nome_servico')->nullable();
            $t->string('periodo_maq_vei')->nullable();
            $t->string('alerta_venci')->nullable();
            $t->string('tipo_itens')->nullable();
            $t->integer('periodo_dias')->nullable();
            $t->integer('alert_venc_dias')->nullable();
            $t->string('user_create')->nullable();
            $t->string('user_edit')->nullable();
            $t->string('situacao')->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->string('sync_status')->nullable();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculo_checklist_itens_servicos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->unsignedBigInteger('id_obra')->nullable();
            $t->unsignedBigInteger('id_veiculo')->nullable();
            $t->unsignedBigInteger('id_checklist')->nullable();
            $t->string('id_local')->nullable();
            $t->string('status')->nullable();
            $t->string('status_ciclo')->nullable();
            $t->string('tipo_checklist')->nullable();
            $t->unsignedBigInteger('id_abertura_vinculada')->nullable();
            $t->dateTime('data_fechamento')->nullable();
            $t->boolean('anomalia_offline')->nullable();
            for ($i = 1; $i <= 4; $i++) {
                $t->string("foto_extra_{$i}")->nullable();
                $t->string("desc_extra_{$i}")->nullable();
            }
            $t->dateTime('data_cadastro')->nullable();
            $t->string('user_create')->nullable();
            $t->string('user_edit')->nullable();
            $t->unsignedBigInteger('id_user')->nullable();
            $t->unsignedBigInteger('id_horimetro')->nullable();
            $t->unsignedBigInteger('id_quilometragem')->nullable();
            $t->string('responsavel')->nullable();
            $t->decimal('km_atual', 12, 2)->nullable();
            $t->decimal('hr_atual', 12, 2)->nullable();
            $t->text('respostas')->nullable();
            $t->text('observacao_geral')->nullable();
            $t->dateTime('data_execucao')->nullable();
            $t->string('sync_status')->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->nullable();
            $t->dateTime('synced_at')->nullable();
            $t->string('client_uuid', 64)->nullable()->unique();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculo_abastecimentos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->string('id_local')->nullable();
            $t->unsignedBigInteger('veiculo_id')->nullable();
            $t->unsignedBigInteger('id_obra')->nullable();
            $t->unsignedBigInteger('id_funcionario')->nullable();
            $t->string('user_create')->nullable();
            $t->string('user_edit')->nullable();
            $t->dateTime('data_abastecimento')->nullable();
            $t->decimal('km_anterior', 12, 2)->nullable();
            $t->decimal('km_atual', 12, 2)->nullable();
            $t->decimal('hr_anterior', 12, 2)->nullable();
            $t->decimal('hr_atual', 12, 2)->nullable();
            $t->string('fornecedor')->nullable();
            $t->string('combustivel')->nullable();
            $t->string('tipo')->nullable();
            $t->decimal('quantidade', 10, 2)->nullable();
            $t->decimal('valor_do_litro', 10, 4)->nullable();
            $t->decimal('valor_total', 12, 2)->nullable();
            $t->string('arquivo_app')->nullable();
            $t->string('arquivo_servidor')->nullable();
            $t->string('sync_status')->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->nullable();
            $t->dateTime('synced_at')->nullable();
            $t->string('client_uuid', 64)->nullable()->unique();
            $t->timestamps();
            $t->softDeletes();
        });

        Schema::create('veiculos_diario_bordo', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id')->nullable();
            $t->string('id_local')->nullable();
            $t->string('ciclo_status')->nullable();
            $t->integer('horas_trabalhadas_minutos')->nullable();
            $t->text('descricao_encerramento')->nullable();
            $t->unsignedBigInteger('id_obra')->nullable();
            $t->unsignedBigInteger('id_veiculo')->nullable();
            $t->unsignedBigInteger('id_user')->nullable();
            $t->string('user_create')->nullable();
            $t->string('user_edit')->nullable();
            $t->dateTime('data_cadastro')->nullable();
            $t->dateTime('horario_inicial')->nullable();
            $t->decimal('hr_anterior', 12, 2)->nullable();
            $t->decimal('km_anterior', 12, 2)->nullable();
            $t->dateTime('horario_final')->nullable();
            $t->decimal('hr_atual', 12, 2)->nullable();
            $t->decimal('km_atual', 12, 2)->nullable();
            $t->text('descricao_atividade')->nullable();
            $t->string('responsavel')->nullable();
            $t->string('arquivo_app')->nullable();
            $t->string('arquivo_servidor')->nullable();
            $t->string('arquivo_fechamento_app')->nullable();
            $t->string('arquivo_fechamento_servidor')->nullable();
            $t->string('sync_status')->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->nullable();
            $t->dateTime('synced_at')->nullable();
            $t->string('client_uuid', 64)->nullable()->unique();
            $t->timestamps();
            $t->softDeletes();
        });
    }

    // =========================================================================
    // Fábricas mínimas (sem model factories — schema é nosso)
    // =========================================================================

    protected function criarEmpresa(string $nome = 'Empresa Teste'): Company
    {
        return Company::forceCreate(['name' => $nome]);
    }

    protected function criarUsuario(Company $company, string $type = 'motorista'): User
    {
        return User::forceCreate([
            'name' => 'Motorista Teste',
            'email' => uniqid('user_') . '@teste.dev',
            'password' => 'secret-password',
            'type' => $type,
            'company_id' => $company->id,
        ]);
    }

    protected function criarVeiculo(Company $company, string $prefixo = 'VT-01'): Veiculo
    {
        return Veiculo::forceCreate([
            'company_id' => $company->id,
            'prefixo' => $prefixo,
            'placa' => 'ABC1D23',
            'tipo_km' => 1,
        ]);
    }

    /** Cria checklist ativo com 1 item; retorna [checklist, item]. */
    protected function criarChecklist(Company $company, Veiculo $veiculo): array
    {
        $checklist = VeiculoChecklist::forceCreate([
            'company_id' => $company->id,
            'id_veiculo' => $veiculo->id,
            'nome_checklist' => 'Checklist Diário',
            'situacao' => 'Ativo',
        ]);
        $item = VeiculoChecklistItem::forceCreate([
            'company_id' => $company->id,
            'id_checklist' => $checklist->id,
            'id_veiculo' => $veiculo->id,
            'nome_servico' => 'Farol dianteiro',
            'situacao' => 'Ativo',
        ]);
        return [$checklist, $item];
    }

    /** Requisição autenticada com a empresa na sessão (CompanyContext). */
    protected function comContexto(User $user, Company $company): static
    {
        return $this->actingAs($user)
            ->withSession(['current_company_id' => $company->id]);
    }

    /** Cenário padrão: empresa + motorista + veículo + checklist com 1 item. */
    protected function cenarioBase(): array
    {
        $company = $this->criarEmpresa();
        $user = $this->criarUsuario($company);
        $veiculo = $this->criarVeiculo($company);
        [$checklist, $item] = $this->criarChecklist($company, $veiculo);
        return compact('company', 'user', 'veiculo', 'checklist', 'item');
    }
}
