<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices para acelerar a listagem de produtos quando há centenas de
 * milhares de registros (155k+ após o ETL do legado).
 *
 * - nome     : usado em ORDER BY nome + WHERE nome LIKE
 * - marca    : filtro opcional + busca
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->index('nome', 'estoque_produtos_nome_index');
            $t->index('marca', 'estoque_produtos_marca_index');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->dropIndex('estoque_produtos_nome_index');
            $t->dropIndex('estoque_produtos_marca_index');
        });
    }
};
