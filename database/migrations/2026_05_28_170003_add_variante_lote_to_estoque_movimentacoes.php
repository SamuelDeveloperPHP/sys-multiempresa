<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parte 2 (EPI) — liga cada movimentação à variante (cor×tamanho) e ao lote.
 * Ambos nullable: movimentações de material comum permanecem com null
 * (comportamento idêntico ao atual).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->foreignId('variante_id')->nullable()->after('produto_id')
                ->constrained('estoque_produto_variantes')->nullOnDelete();
            $t->foreignId('lote_id')->nullable()->after('variante_id')
                ->constrained('estoque_lotes')->nullOnDelete();

            $t->index('variante_id');
            $t->index('lote_id');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->dropForeign(['variante_id']);
            $t->dropForeign(['lote_id']);
            $t->dropColumn(['variante_id', 'lote_id']);
        });
    }
};
