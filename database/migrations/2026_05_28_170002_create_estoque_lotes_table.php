<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parte 2 (EPI) — LOTE de entrada de EPI/calçado/EPC/uniforme.
 *
 * Cada ENTRADA de EPI cria um lote com: CA (Certificado de Aprovação),
 * número do lote, validade e quantidade. O saldo da variante numa obra =
 * soma de quantidade_atual dos seus lotes.
 *
 * Na SAÍDA o operador escolhe o lote (sistema sugere o que vence primeiro —
 * FEFO) e a quantidade_atual é decrementada.
 *
 * Escopo por empresa+obra (company_id, obra_id), igual a saldo/movimentação.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_lotes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();
            $t->foreignId('variante_id')->nullable()->constrained('estoque_produto_variantes')->nullOnDelete();
            $t->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();

            // Dados do lote de EPI
            $t->string('numero_ca', 30)->nullable();        // Certificado de Aprovação
            $t->string('numero_lote', 60)->nullable();
            $t->date('validade')->nullable();
            $t->foreignId('fornecedor_id')->nullable()->constrained('fornecedores')->nullOnDelete();
            $t->decimal('valor_unitario', 12, 2)->default(0);

            // Quantidades
            $t->decimal('quantidade_inicial', 14, 3)->default(0);
            $t->decimal('quantidade_atual', 14, 3)->default(0);  // decrementa nas saídas

            $t->date('data_entrada')->nullable();
            $t->foreignId('movimentacao_entrada_id')->nullable()
                ->constrained('estoque_movimentacoes')->nullOnDelete();

            $t->timestamps();
            $t->softDeletes();

            // FEFO: ordenar por validade dentro de (produto, variante, obra)
            $t->index(['produto_id', 'variante_id', 'obra_id', 'validade'], 'estoque_lotes_fefo_idx');
            $t->index(['company_id', 'obra_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_lotes');
    }
};
