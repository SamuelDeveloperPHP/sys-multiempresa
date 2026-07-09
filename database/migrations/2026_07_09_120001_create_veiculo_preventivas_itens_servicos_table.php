<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — checklist de serviços executados por OS preventiva.
 *
 * Cada linha registra se UM item do plano (veiculo_preventivas_itens) foi
 * realizado ('sim') ou não ('nao', com justificativa obrigatória) dentro de
 * uma OS (veiculo_preventivas_itens_realizadas). É a base da "pendência
 * herdada": se a última linha de um item de um veículo é 'nao', ele fica
 * pendente até uma OS futura marcá-lo 'sim'.
 *
 * Snapshot de nome_servico/periodo/criticidade para preservar o histórico
 * mesmo que o plano mude depois.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_preventivas_itens_servicos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_manutencao')->constrained('veiculo_preventivas_itens_realizadas')->cascadeOnDelete();
            $t->foreignId('id_servico_preventiva')->nullable()->constrained('veiculo_preventivas_itens')->nullOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->foreignId('id_preventiva')->nullable()->constrained('veiculo_preventivas')->nullOnDelete();
            $t->string('nome_servico', 191)->nullable();      // snapshot do item do plano
            $t->integer('periodo')->nullable();                // snapshot do ciclo (periodo_maq_vei)
            $t->string('status', 10)->default('sim');          // 'sim' | 'nao'
            $t->text('observacao')->nullable();                // obrigatória quando status='nao'
            $t->string('criticidade', 20)->nullable();         // 'seguranca' | 'operacional' | 'estetico'
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();

            $t->index('id_manutencao');
            // lookup da pendência herdada: último status por (veículo, item do plano)
            $t->index(['id_veiculo', 'id_servico_preventiva'], 'vp_serv_veic_item_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_preventivas_itens_servicos');
    }
};
