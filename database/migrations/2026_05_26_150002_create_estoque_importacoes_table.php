<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Log/progresso de cada importação do catálogo Leroy → estoque_produtos.
 * O front faz polling pra mostrar a barra de % e o progresso por categoria.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_importacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users', 'id', 'fk_estimp_user')->cascadeOnDelete();

            $t->enum('status', ['queued', 'running', 'success', 'partial', 'failed', 'cancelled'])
              ->default('queued')->index();

            $t->timestamp('queued_at')->useCurrent();
            $t->timestamp('started_at')->nullable();
            $t->timestamp('finished_at')->nullable();

            // Previsto x realizado (base do cálculo de %)
            $t->unsignedInteger('total_produtos_previsto')->default(0);
            $t->unsignedInteger('total_produtos_importados')->default(0);

            $t->unsignedInteger('total_categorias')->default(0);
            $t->unsignedInteger('total_imagens')->default(0);
            $t->unsignedInteger('total_falhas')->default(0);

            // Progresso por categoria: [{categoria, importados, total}]
            $t->json('progresso_categorias')->nullable();
            $t->text('erro_global')->nullable();

            $t->timestamps();
            $t->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_importacoes');
    }
};
