<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Inventário (contagem física) por obra.
 *
 * Fluxo:
 *   ABERTO   — snapshot do saldo atual gerado em itens. Contagem em aberto.
 *   FECHADO  — almoxarife confirma diferenças → gera movs AJUSTE_INVENTARIO
 *              automaticamente para cada item com saldo_contado ≠ saldo_sistema.
 *   CANCELADO — abandonado sem ajustes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_inventarios', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('numero', 30)->index(); // INV-2026-00001
            $t->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $t->foreignId('responsavel_id')->constrained('users')->cascadeOnDelete();

            $t->enum('status', ['ABERTO', 'FECHADO', 'CANCELADO'])->default('ABERTO')->index();
            $t->date('data_inicio');
            $t->timestamp('data_fechamento')->nullable();

            $t->text('observacao')->nullable();

            $t->decimal('valor_diferenca_total', 14, 2)->default(0);
            $t->integer('qtd_itens_divergentes')->default(0);

            $t->timestamps();
            $t->softDeletes();

            $t->unique(['company_id', 'numero']);
            $t->index(['company_id', 'status', 'obra_id']);
        });

        Schema::create('estoque_inventario_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('inventario_id')->constrained('estoque_inventarios')->cascadeOnDelete();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();

            // Saldo no momento da abertura (snapshot)
            $t->decimal('saldo_sistema', 14, 3);
            // Quantidade efetivamente contada (preenchido pelo almoxarife)
            $t->decimal('saldo_contado', 14, 3)->nullable();
            // diferenca = saldo_contado - saldo_sistema
            $t->decimal('diferenca', 14, 3)->default(0);

            $t->decimal('valor_unitario', 12, 2)->default(0);
            $t->decimal('valor_diferenca', 14, 2)->default(0);

            $t->text('observacao')->nullable();
            $t->boolean('contado')->default(false);

            $t->timestamps();

            $t->index(['inventario_id', 'produto_id']);
            $t->index('contado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_inventario_itens');
        Schema::dropIfExists('estoque_inventarios');
    }
};
