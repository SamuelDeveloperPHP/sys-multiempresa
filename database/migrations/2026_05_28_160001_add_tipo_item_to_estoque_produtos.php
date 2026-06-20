<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parte 1 (EPI) — classificação do item no catálogo.
 *
 *   tipo_item: distingue material comum de EPI / calçado / EPC / uniforme.
 *              Quando != 'material', o produto passa a controlar VARIAÇÕES
 *              (cor × tamanho) — ver estoque_produto_variacoes.
 *
 *   controla_variacao: flag derivada (tipo_item != material) materializada
 *              para query rápida nos fluxos de entrada/saída.
 *
 * CA, lote e validade NÃO ficam aqui — são capturados por lote na ENTRADA
 * (Parte 2), pois variam a cada compra.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->string('tipo_item', 20)->default('material')->after('categoria_id');
            $t->boolean('controla_variacao')->default(false)->after('tipo_item');
            $t->index('tipo_item');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->dropIndex(['tipo_item']);
            $t->dropColumn(['tipo_item', 'controla_variacao']);
        });
    }
};
