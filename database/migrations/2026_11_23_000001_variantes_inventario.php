<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_inventario_itens', function (Blueprint $t) {
            $t->foreignId('variante_id')->nullable()->constrained('estoque_produto_variantes')->restrictOnDelete();
            $t->boolean('variante_identificada')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('estoque_inventario_itens', function (Blueprint $t) {
            $t->dropConstrainedForeignId('variante_id');
            $t->dropColumn('variante_identificada');
        });
    }
};
