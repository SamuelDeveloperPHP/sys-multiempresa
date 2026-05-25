<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Requisições de material — fluxo:
 *   RASCUNHO   — solicitante editando (não enviada)
 *   ENVIADA    — aguardando aprovação
 *   APROVADA   — aprovador validou; aguardando atendimento (saída no estoque)
 *   ATENDIDA   — almoxarife baixou do estoque (geralmente parcial OK)
 *   REJEITADA  — aprovador negou (texto em motivo_rejeicao)
 *   CANCELADA  — solicitante desistiu antes de aprovar
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_requisicoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('numero', 30)->index(); // gerado automático: REQ-2026-00001

            // Obra de origem (de onde sai o material) e destino (onde será usado)
            $t->foreignId('obra_origem_id')->constrained('obras')->cascadeOnDelete();
            $t->foreignId('obra_destino_id')->nullable()->constrained('obras')->nullOnDelete();

            // Quem pediu e quem aprovou
            $t->foreignId('solicitante_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('aprovador_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('atendente_id')->nullable()->constrained('users')->nullOnDelete();

            $t->enum('status', [
                'RASCUNHO', 'ENVIADA', 'APROVADA', 'ATENDIDA', 'REJEITADA', 'CANCELADA',
            ])->default('RASCUNHO')->index();

            $t->date('data_solicitacao');
            $t->timestamp('data_envio')->nullable();
            $t->timestamp('data_aprovacao')->nullable();
            $t->timestamp('data_atendimento')->nullable();

            $t->text('observacao_solicitante')->nullable();
            $t->text('observacao_aprovador')->nullable();
            $t->text('motivo_rejeicao')->nullable();

            $t->decimal('valor_total_estimado', 14, 2)->default(0);

            $t->timestamps();
            $t->softDeletes();

            $t->unique(['company_id', 'numero']);
            $t->index(['company_id', 'status']);
            $t->index(['solicitante_id', 'status']);
        });

        Schema::create('estoque_requisicao_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('requisicao_id')->constrained('estoque_requisicoes')->cascadeOnDelete();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();

            $t->decimal('quantidade_solicitada', 14, 3);
            $t->decimal('quantidade_atendida', 14, 3)->default(0);

            $t->decimal('valor_unitario_estimado', 12, 2)->default(0);
            $t->decimal('valor_total_estimado', 14, 2)->default(0);

            $t->text('observacao')->nullable();

            $t->timestamps();

            $t->index(['requisicao_id', 'produto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_requisicao_itens');
        Schema::dropIfExists('estoque_requisicoes');
    }
};
