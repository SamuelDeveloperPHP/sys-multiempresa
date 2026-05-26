<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Categoria PRINCIPAL da hierarquia da Leroy Merlin (raiz).
 *
 * Estrutura externa da Leroy:
 *   father (principal) -> primaria -> secundaria -> produto
 *
 * Catálogo é GLOBAL (não multi-tenant): é referência de mercado, a mesma
 * pra todas as empresas. Quando integrarmos com estoque_produtos no futuro,
 * cada empresa poderá importar o que quiser.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_leroy_categorias_principais', function (Blueprint $table) {
            $table->id();
            $table->string('leroy_id', 64)->unique()->comment('ID da categoria na Leroy Merlin (campo father)');
            $table->string('nome', 255);
            $table->timestamps();
            $table->softDeletes();
            $table->index('nome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_leroy_categorias_principais');
    }
};
