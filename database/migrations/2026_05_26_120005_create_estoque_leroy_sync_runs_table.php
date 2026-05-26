<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Log de execuções de sincronização — usado pelo front pra mostrar progresso
 * (polling) e histórico de runs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_leroy_sync_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'id', 'fk_lm_runs_user')->cascadeOnDelete();

            $table->enum('status', ['queued', 'running', 'success', 'partial', 'failed', 'cancelled'])
                  ->default('queued')
                  ->index();

            $table->timestamp('queued_at')->useCurrent();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();

            $table->unsignedInteger('total_categorias_principais')->default(0);
            $table->unsignedInteger('total_categorias_primarias')->default(0);
            $table->unsignedInteger('total_categorias_secundarias')->default(0);
            $table->unsignedInteger('total_produtos')->default(0);
            $table->unsignedInteger('total_falhas')->default(0);

            $table->json('falhas_detalhes')->nullable()->comment('Array de {categoria_id, motivo}');
            $table->text('erro_global')->nullable();

            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_leroy_sync_runs');
    }
};
