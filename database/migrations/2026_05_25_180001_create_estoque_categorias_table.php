<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Árvore de categorias de produtos.
 *
 * Substitui os 3 níveis fixos do sync-products (estoque_categoria_principal /
 * primaria / secundaria) por uma estrutura recursiva via parent_id. Mais
 * flexível: empresa pode ter 1, 2, 3 ou N níveis.
 *
 * No ETL, mapearemos:
 *   estoque_categoria_principal  → categoria nivel 0 (parent_id null)
 *   estoque_categoria_primaria   → categoria nivel 1 (parent_id = principal)
 *   estoque_categoria_secundaria → categoria nivel 2 (parent_id = primaria)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_categorias', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('parent_id')->nullable()->constrained('estoque_categorias')->nullOnDelete();

            $t->string('nome', 191);
            $t->string('slug', 191)->nullable();
            $t->string('descricao', 500)->nullable();
            $t->integer('ordem')->default(0);
            $t->boolean('ativo')->default(true);

            // IDs do sistema legado (sync-products) — usado pelo ETL para
            // mapear referências sem precisar recriar todos os FKs manualmente.
            $t->string('legacy_kind', 20)->nullable()->comment('principal | primaria | secundaria');
            $t->unsignedBigInteger('legacy_id')->nullable();

            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();

            $t->index(['company_id', 'parent_id']);
            $t->index(['legacy_kind', 'legacy_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_categorias');
    }
};
