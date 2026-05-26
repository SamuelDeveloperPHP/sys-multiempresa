<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Devoluções internas de material — fluxo:
 *
 *   PENDENTE  : criada pelo funcionário (ou almoxarife em nome dele).
 *               Aguarda aprovação do almoxarife.
 *   APROVADA  : almoxarife validou (com senha). Sistema gera mov tipo
 *               DEVOLUCAO automaticamente, vinculada à SAIDA original via
 *               movimentacao_origem_id, e atualiza o saldo via Observer.
 *   REJEITADA : almoxarife negou. Nenhuma alteração no estoque.
 *
 * O caso típico: funcionário retirou 100 parafusos, usou 70, devolve 30.
 * A movimentacao_saida_id liga à saída original para auditoria/relatório
 * de "consumo efetivo vs retirado".
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_devolucoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('numero', 30)->index(); // DEV-2026-00001

            // Quem está devolvendo (funcionário)
            $t->foreignId('funcionario_user_id')->constrained('users')->cascadeOnDelete();

            // Liga ao produto e à OBRA que está recebendo de volta
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();
            $t->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();

            // Vincula à SAÍDA original (opcional — pode devolver material avulso)
            $t->foreignId('movimentacao_saida_id')->nullable()->constrained('estoque_movimentacoes')->nullOnDelete();

            // Quantidade devolvida + estado do material
            $t->decimal('quantidade', 14, 3);
            $t->decimal('valor_unitario', 12, 2)->default(0);
            $t->enum('estado_material', ['NOVO', 'USADO_OK', 'AVARIADO'])->default('USADO_OK');
            $t->text('motivo')->nullable();    // ex.: "sobra de obra"
            $t->text('observacao')->nullable();

            // Fluxo
            $t->enum('status', ['PENDENTE', 'APROVADA', 'REJEITADA'])->default('PENDENTE')->index();
            $t->timestamp('data_criacao');
            $t->foreignId('aprovador_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('data_aprovacao')->nullable();
            $t->text('motivo_rejeicao')->nullable();

            // Movimentação gerada quando aprovada (FK ao registro de mov)
            $t->foreignId('movimentacao_gerada_id')->nullable()->constrained('estoque_movimentacoes')->nullOnDelete();

            $t->timestamps();
            $t->softDeletes();

            $t->unique(['company_id', 'numero']);
            $t->index(['company_id', 'status']);
            $t->index(['funcionario_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_devolucoes');
    }
};
