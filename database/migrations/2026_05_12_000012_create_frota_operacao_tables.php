<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — operacao do dia-a-dia:
 *   - veiculo_horimetro
 *   - veiculo_quilometragems
 *   - veiculo_abastecimentos
 *   - veiculos_diario_bordo
 *
 * Todas com id_local (UPSERT idempotente) + sync infra.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_horimetro', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('id_local', 64)->nullable();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->foreignId('id_funcionario')->nullable()->constrained('funcionarios')->nullOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->integer('horimetro_atual')->nullable();
            $t->integer('horimetro_novo')->nullable();
            $t->dateTime('data_horimetro')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->unique('id_local');
            $t->index(['veiculo_id', 'data_horimetro']);
        });

        Schema::create('veiculo_quilometragems', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('id_local', 64)->nullable();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->foreignId('id_funcionario')->nullable()->constrained('funcionarios')->nullOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->integer('quilometragem_atual')->nullable();
            $t->integer('quilometragem_nova')->nullable();
            $t->dateTime('data_quilometragem')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->unique('id_local');
            $t->index(['veiculo_id', 'data_quilometragem']);
        });

        Schema::create('veiculo_abastecimentos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('id_local', 64)->nullable();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_funcionario')->nullable()->constrained('funcionarios')->nullOnDelete();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->dateTime('data_abastecimento')->nullable();
            $t->integer('km_anterior')->nullable();
            $t->integer('km_atual')->nullable();
            $t->integer('hr_anterior')->nullable();
            $t->integer('hr_atual')->nullable();
            $t->string('fornecedor', 191)->nullable();
            $t->string('combustivel', 60)->nullable();
            $t->string('tipo', 30)->nullable();
            $t->decimal('quantidade', 10, 2)->nullable();
            $t->decimal('valor_do_litro', 10, 4)->nullable();
            $t->decimal('valor_total', 12, 2)->nullable();
            $t->string('arquivo_app')->nullable();
            $t->text('arquivo_servidor')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->unique('id_local');
            $t->index(['veiculo_id', 'data_abastecimento']);
        });

        Schema::create('veiculos_diario_bordo', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('id_local', 64)->nullable();
            $t->string('ciclo_status', 20)->default('ABERTO');
            $t->integer('horas_trabalhadas_minutos')->default(0);
            $t->text('descricao_encerramento')->nullable();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->foreignId('id_user')->nullable()->constrained('users')->nullOnDelete();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->dateTime('data_cadastro')->nullable();
            $t->dateTime('horario_inicial')->nullable();
            $t->integer('hr_anterior')->nullable();
            $t->integer('km_anterior')->nullable();
            $t->dateTime('horario_final')->nullable();
            $t->integer('hr_atual')->nullable();
            $t->integer('km_atual')->nullable();
            $t->text('descricao_atividade')->nullable();
            $t->string('arquivo_app')->nullable();
            $t->text('arquivo_servidor')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->unique('id_local');
            $t->index(['id_veiculo', 'ciclo_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculos_diario_bordo');
        Schema::dropIfExists('veiculo_abastecimentos');
        Schema::dropIfExists('veiculo_quilometragems');
        Schema::dropIfExists('veiculo_horimetro');
    }
};
