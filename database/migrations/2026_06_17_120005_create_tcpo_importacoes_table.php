<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Log/progresso de cada importação do TCPO → catálogo global.
 * Espelha estoque_importacoes (base do polling de progresso, quando houver UI).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('tcpo_importacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()
              ->constrained('users', 'id', 'fk_tcpoimp_user')->nullOnDelete();

            $t->string('base', 32)->default('TCPO');
            $t->string('escopo', 191)->nullable()->comment('ex: Capítulo 06 - Alvenarias');

            $t->enum('status', ['queued', 'running', 'success', 'partial', 'failed', 'cancelled'])
              ->default('queued')->index();

            $t->timestamp('queued_at')->useCurrent();
            $t->timestamp('started_at')->nullable();
            $t->timestamp('finished_at')->nullable();

            $t->unsignedInteger('total_composicoes_previsto')->default(0);
            $t->unsignedInteger('total_composicoes_importadas')->default(0);
            $t->unsignedInteger('total_insumos')->default(0);
            $t->unsignedInteger('total_itens')->default(0);
            $t->unsignedInteger('total_categorias')->default(0);
            $t->unsignedInteger('total_falhas')->default(0);

            // Feed de progresso: [{composicao, itens, em}]
            $t->json('progresso')->nullable();
            $t->text('erro_global')->nullable();

            $t->timestamps();
            $t->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tcpo_importacoes');
    }
};
