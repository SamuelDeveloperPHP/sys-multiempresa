<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de produtos. O saldo POR OBRA fica em `estoque_saldos`
 * (denormalizado). Aqui temos apenas dados imutáveis do produto.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_produtos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('categoria_id')->nullable()->constrained('estoque_categorias')->nullOnDelete();
            $t->foreignId('fornecedor_padrao_id')->nullable()->constrained('fornecedores')->nullOnDelete();

            // Identificação
            $t->string('sku', 100)->index();          // Código interno (gerado auto se vazio)
            $t->string('codigo_barras', 100)->nullable()->index(); // EAN/UPC opcional
            $t->string('nome', 250);
            $t->string('marca', 150)->nullable();
            $t->text('descricao')->nullable();

            // Unidade e medidas
            $t->string('unidade', 20)->default('UN');  // UN, KG, L, M, M2, M3, CX, PC, PAR
            $t->decimal('peso_kg', 10, 3)->nullable();

            // Valores (preço de referência — preço real vem em cada movimentação)
            $t->decimal('valor_unitario', 12, 2)->default(0);
            $t->decimal('valor_ultima_entrada', 12, 2)->nullable();

            // Política de estoque (por produto — alerta de baixo)
            $t->decimal('estoque_minimo', 12, 3)->default(0);
            $t->decimal('estoque_maximo', 12, 3)->nullable();

            // Mídia
            $t->string('imagem', 500)->nullable();     // path no disco / OneDrive

            // Status
            $t->boolean('ativo')->default(true);

            // Legacy mapping
            $t->string('legacy_sku', 100)->nullable()->index();
            $t->unsignedBigInteger('legacy_id_categoria_principal')->nullable();
            $t->unsignedBigInteger('legacy_id_categoria_primaria')->nullable();
            $t->unsignedBigInteger('legacy_id_categoria_secundaria')->nullable();

            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();

            $t->unique(['company_id', 'sku']);
            $t->index(['company_id', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_produtos');
    }
};
