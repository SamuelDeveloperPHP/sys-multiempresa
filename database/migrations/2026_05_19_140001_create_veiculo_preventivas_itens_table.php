<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogo de itens de uma preventiva (cada item tem seu periodo).
 * Ex: preventiva "Revisao geral" pode ter os itens:
 *   - trocar filtro de oleo @ periodo_maq_vei=10000
 *   - trocar correia @ periodo_maq_vei=30000
 *   - trocar pastilhas @ periodo_maq_vei=20000
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_preventivas_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_preventiva')->constrained('veiculo_preventivas')->cascadeOnDelete();
            $t->foreignId('id_veiculo')->nullable()->constrained('veiculos')->nullOnDelete();

            $t->string('nome_servico', 250);
            $t->string('serial_number', 50)->nullable();
            // periodo em km ou hr (depende de tipo_itens / veiculo)
            $t->integer('periodo_maq_vei')->nullable();
            $t->integer('periodo_mes')->nullable();
            $t->string('tipo_itens', 10)->nullable();
            // 1=Obrigatoria, 2=Conforme condicao, 3=Conferir
            $t->string('situacao', 11)->default('1');

            // dias/km/hr antes do alerta
            $t->integer('alerta_venci')->nullable();
            $t->integer('alert_venc_mes')->nullable();

            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();

            $t->index(['id_veiculo', 'periodo_maq_vei']);
            $t->index(['id_preventiva']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_preventivas_itens');
    }
};
