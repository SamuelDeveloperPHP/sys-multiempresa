<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — manutencao preventiva:
 *   - veiculo_preventivas (catalogo de ciclos)
 *   - veiculo_preventivas_itens_realizadas (historico de execucoes)
 *
 * Estas duas sao DOWNLOAD-only no mobile (catalogo gerado no admin web).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_preventivas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->string('nome_preventiva', 191);
            $t->string('nome_servico', 191)->nullable();
            $t->string('tipo_veiculo', 30)->nullable();
            $t->string('situacao', 30)->default('Ativo');
            $t->integer('periodo')->nullable();
            $t->string('tipo', 30)->nullable();
            $t->integer('alerta_venci')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index('id_veiculo');
        });

        Schema::create('veiculo_preventivas_itens_realizadas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->unsignedBigInteger('fornecedor_id')->nullable();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_preventiva')->nullable()->constrained('veiculo_preventivas')->nullOnDelete();
            $t->foreignId('id_motorista')->nullable()->constrained('funcionarios')->nullOnDelete();
            $t->string('tipo', 30)->nullable();
            $t->string('nf_pecas', 60)->nullable();
            $t->string('nf_mao_obra', 60)->nullable();
            $t->decimal('valor_do_servico', 12, 2)->nullable();
            $t->decimal('valor_da_mao_obra', 12, 2)->nullable();
            $t->decimal('total_valor_servico', 12, 2)->nullable();
            $t->integer('quilometragem_atual')->nullable();
            $t->integer('quilometragem_nova')->nullable();
            $t->integer('campo_calc_km')->nullable();
            $t->integer('horimetro_atual')->nullable();
            $t->integer('horimetro_proximo')->nullable();
            $t->integer('campo_cal_hr')->nullable();
            $t->date('data_de_execucao')->nullable();
            $t->date('data_previsao_termino')->nullable();
            $t->date('data_conclusao')->nullable();
            $t->integer('campo_cal_mes')->nullable();
            $t->date('data_de_vencimento')->nullable();
            $t->text('descricao')->nullable();
            $t->string('status_realizado', 30)->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->tinyInteger('sync_status')->default(0);
            $t->dateTime('data_sincronizacao')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['id_veiculo', 'data_de_execucao'], 'vp_realizadas_veic_exec_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_preventivas_itens_realizadas');
        Schema::dropIfExists('veiculo_preventivas');
    }
};
