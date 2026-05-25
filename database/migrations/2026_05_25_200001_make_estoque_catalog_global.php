<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Torna o catálogo (categorias + produtos) GLOBAL — sem company_id.
 *
 * Motivo: o catálogo é compartilhado entre todas as empresas/obras. O que é
 * específico de empresa+obra é o ESTOQUE (saldos + movimentações + requisições
 * + inventários) — esses continuam com company_id.
 *
 * Mudanças:
 *   - estoque_categorias.company_id  → nullable (catálogo global)
 *   - estoque_produtos.company_id    → nullable (catálogo global)
 *   - estoque_produtos.sku           → único GLOBALMENTE (era único por empresa)
 *
 * NÃO mexemos em estoque_saldos, estoque_movimentacoes, estoque_requisicoes,
 * estoque_inventarios — continuam por empresa.
 *
 * Para os registros existentes (smoke tests + seeds iniciais), zeramos o
 * company_id para deixar tudo no escopo global.
 */
return new class extends Migration {
    public function up(): void
    {
        // -----------------------------------------------------------------
        // 1) Drop FK + index antigos antes de alterar (MySQL exige ordem)
        // -----------------------------------------------------------------
        Schema::table('estoque_categorias', function (Blueprint $t) {
            $t->dropForeign(['company_id']);
            $t->dropIndex(['company_id', 'parent_id']);
        });
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->dropForeign(['company_id']);
            $t->dropUnique(['company_id', 'sku']);
            $t->dropIndex(['company_id', 'ativo']);
        });

        // -----------------------------------------------------------------
        // 2) Torna nullable + zera valores antigos + recria FKs
        // -----------------------------------------------------------------
        Schema::table('estoque_categorias', function (Blueprint $t) {
            $t->foreignId('company_id')->nullable()->change();
        });
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->foreignId('company_id')->nullable()->change();
        });

        // Zera company_id em todos os registros existentes — vira global
        DB::table('estoque_categorias')->update(['company_id' => null]);
        DB::table('estoque_produtos')->update(['company_id' => null]);

        // -----------------------------------------------------------------
        // 3) Recria índices/constraints na nova lógica
        // -----------------------------------------------------------------
        Schema::table('estoque_categorias', function (Blueprint $t) {
            $t->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
            $t->index(['parent_id']);
        });
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
            // SKU agora é único GLOBALMENTE (catálogo compartilhado)
            $t->unique('sku', 'estoque_produtos_sku_unique');
            $t->index('ativo');
        });
    }

    public function down(): void
    {
        // Reverter exige tomar uma decisão: para qual empresa atribuir os
        // registros que ficaram NULL? Tornar isso reversível automaticamente
        // é perigoso. Deixamos uma down() segura que apenas remove os
        // índices novos. Re-aplicar company_id NOT NULL precisa ser manual.
        Schema::table('estoque_produtos', function (Blueprint $t) {
            $t->dropUnique('estoque_produtos_sku_unique');
            $t->dropIndex(['ativo']);
        });
        Schema::table('estoque_categorias', function (Blueprint $t) {
            $t->dropIndex(['parent_id']);
        });
    }
};
