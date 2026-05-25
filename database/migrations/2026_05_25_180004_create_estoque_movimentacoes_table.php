<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Movimentações de estoque — registro IMUTÁVEL de toda entrada/saída.
 * É a "fonte da verdade". A tabela estoque_saldos é derivada daqui.
 *
 * Tipos:
 *   ENTRADA              — compra/recebimento (com fornecedor + NF)
 *   SAIDA                — consumo avulso (sem requisição)
 *   TRANSF_OUT           — saída para outra obra (par com TRANSF_IN)
 *   TRANSF_IN            — entrada vinda de outra obra (par com TRANSF_OUT)
 *   AJUSTE_INVENTARIO    — diferença gerada pelo fechamento de inventário
 *   DEVOLUCAO            — devolução ao fornecedor (saída) ou de um requisitante (entrada)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_movimentacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();
            $t->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();

            $t->enum('tipo', [
                'ENTRADA', 'SAIDA',
                'TRANSF_OUT', 'TRANSF_IN',
                'AJUSTE_INVENTARIO',
                'DEVOLUCAO',
            ]);

            // Quantidade SEMPRE positiva — o sinal (+ ou -) é derivado do tipo.
            $t->decimal('quantidade', 14, 3);
            $t->decimal('valor_unitario', 12, 2)->default(0);
            $t->decimal('valor_total', 14, 2)->default(0);

            $t->date('data_movimento');
            $t->text('observacao')->nullable();

            // Referências opcionais (depende do tipo)
            $t->foreignId('fornecedor_id')->nullable()->constrained('fornecedores')->nullOnDelete();
            $t->string('nota_fiscal', 50)->nullable()->index();
            $t->date('data_nota_fiscal')->nullable();

            // Para TRANSF_OUT/IN: aponta para a obra contraparte
            $t->foreignId('obra_contraparte_id')->nullable()->constrained('obras')->nullOnDelete();
            // Para TRANSF_OUT/IN: aponta para o movimento par (1:1)
            $t->foreignId('movimentacao_par_id')->nullable()->constrained('estoque_movimentacoes')->nullOnDelete();

            // Referência ao documento de origem
            $t->unsignedBigInteger('requisicao_id')->nullable()->index();
            $t->unsignedBigInteger('requisicao_item_id')->nullable()->index();
            $t->unsignedBigInteger('inventario_id')->nullable()->index();

            $t->string('user_create', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();

            $t->index(['produto_id', 'obra_id', 'data_movimento']);
            $t->index(['company_id', 'tipo', 'data_movimento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_movimentacoes');
    }
};
