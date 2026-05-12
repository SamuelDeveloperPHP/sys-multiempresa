<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — checklists:
 *   - veiculo_checklist (modelos de checklist por veiculo)
 *   - veiculo_checklist_itens (perguntas/itens do checklist)
 *   - veiculo_checklist_itens_servicos (execucao agrupada: ABERTURA/FECHAMENTO)
 *   - veiculo_checklist_itens_realizados (itens preenchidos)
 *   - veiculo_checklist_evidencias (fotos unificadas via parent_tabela + parent_id_local)
 *
 * Todas as tabelas de UPLOAD tem `id_local` + `sync_*` para idempotencia mobile.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_checklist', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->string('nome_checklist', 191);
            $t->string('situacao', 30)->default('Ativo');
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->dateTime('data_sincronizacao')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->timestamps();
            $t->softDeletes();
            $t->index('id_veiculo');
        });

        Schema::create('veiculo_checklist_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_checklist')->nullable()->constrained('veiculo_checklist')->cascadeOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->string('nome_servico', 191);
            $t->integer('periodo_maq_vei')->nullable();
            $t->integer('alerta_venci')->nullable();
            $t->string('tipo_itens', 30)->nullable();
            $t->integer('periodo_dias')->nullable();
            $t->integer('alert_venc_dias')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->string('situacao', 30)->default('Ativo');
            $t->dateTime('data_sincronizacao')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->timestamps();
            $t->softDeletes();
            $t->index('id_checklist');
        });

        Schema::create('veiculo_checklist_itens_servicos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->foreignId('id_checklist')->nullable()->constrained('veiculo_checklist')->nullOnDelete();
            $t->string('id_local', 64)->nullable()->index();
            $t->string('status', 30)->nullable();
            $t->string('status_ciclo', 30)->default('ABERTO');
            $t->string('tipo_checklist', 30)->default('ABERTURA');
            $t->string('id_abertura_vinculada', 64)->nullable();
            $t->dateTime('data_fechamento')->nullable();
            $t->boolean('anomalia_offline')->default(false);
            // 4 slots de fotos extras
            for ($i = 1; $i <= 4; $i++) {
                $t->string("foto_extra_$i")->nullable();
                $t->string("desc_extra_$i")->nullable();
            }
            $t->dateTime('data_cadastro')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->unsignedBigInteger('id_horimetro')->nullable();
            $t->unsignedBigInteger('id_quilometragem')->nullable();
            // sync infra
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->unique('id_local');
            $t->index(['id_veiculo', 'status_ciclo']);
        });

        Schema::create('veiculo_checklist_itens_realizados', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_checklist')->nullable()->constrained('veiculo_checklist')->nullOnDelete();
            $t->string('id_local', 64)->nullable()->index();
            $t->string('id_checklist_realizado', 64)->nullable()->index(); // FK local (id_local do servico pai)
            $t->foreignId('id_checklist_itens')->nullable()->constrained('veiculo_checklist_itens')->nullOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->dateTime('data_cadastro')->nullable();
            $t->string('status', 10)->nullable();
            $t->string('arquivo_app')->nullable();
            $t->string('arquivo_servidor')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->integer('horimetro_atual')->nullable();
            $t->integer('horimetro_novo')->nullable();
            $t->integer('quilometragem_atual')->nullable();
            $t->integer('quilometragem_nova')->nullable();
            $t->text('observacao')->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->unique('id_local');
        });

        // Evidencias unificadas (substituem fotos espalhadas em outras tabelas)
        Schema::create('veiculo_checklist_evidencias', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('id_local', 64)->nullable()->index();
            $t->string('parent_tabela', 80);
            $t->string('parent_id_local', 64);
            $t->string('campo_foto', 50);
            $t->string('arquivo_local', 500)->nullable();
            $t->string('arquivo_app')->nullable();
            $t->string('arquivo_servidor')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->text('sync_error')->nullable();
            $t->integer('sync_attempts')->default(0);
            $t->dateTime('synced_at')->nullable();
            $t->timestamps();
            $t->unique('id_local');
            $t->index(['parent_tabela', 'parent_id_local']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_checklist_evidencias');
        Schema::dropIfExists('veiculo_checklist_itens_realizados');
        Schema::dropIfExists('veiculo_checklist_itens_servicos');
        Schema::dropIfExists('veiculo_checklist_itens');
        Schema::dropIfExists('veiculo_checklist');
    }
};
