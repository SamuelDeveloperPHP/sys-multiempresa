<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices para acelerar relatórios gerenciais sobre estoque_movimentacoes.
 *
 * Os relatórios (consumo por obra, top produtos, giro) filtram por:
 *   tipo + data_movimento  → muito frequente, índice composto
 *
 * Em volume de centenas de milhares/milhões de movs, sem esses índices
 * a query agregada faz full-scan + filesort. Com índice, fica em O(log n).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->index(['tipo', 'data_movimento'], 'estoque_mov_tipo_data_idx');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->dropIndex('estoque_mov_tipo_data_idx');
        });
    }
};
