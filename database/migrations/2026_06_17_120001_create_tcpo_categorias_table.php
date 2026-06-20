<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Árvore de categorias/EAP do TCPO (capítulo → grupos → subgrupos).
 *
 * CATÁLOGO GLOBAL de referência — igual estoque_leroy_* (NÃO tem company_id
 * nem Tenantable). O escopo por empresa/obra só entra quando uma composição
 * for usada num orçamento (etapa futura).
 *
 * Idempotência: chave (base, legacy_path), onde legacy_path é o caminho único
 * do nó na árvore do TCPOweb (ex.: "Serviços>06...>Alvenaria de vedação").
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('tcpo_categorias', function (Blueprint $t) {
            $t->id();
            $t->foreignId('parent_id')->nullable()
              ->constrained('tcpo_categorias', 'id', 'fk_tcpo_cat_parent')->nullOnDelete();

            $t->string('base', 32)->default('TCPO')->comment('TCPO, SINAPI, NOVO_SICRO...');
            $t->string('codigo', 64)->nullable()->comment('Código do capítulo/grupo, ex: 06');
            $t->string('nome', 300);
            $t->unsignedSmallInteger('nivel')->default(0);
            $t->integer('ordem')->default(0);

            // Identificador do nó na árvore do TCPOweb — chave de idempotência.
            $t->string('legacy_path', 255)->nullable();

            $t->timestamps();
            $t->softDeletes();

            $t->index(['base', 'codigo']);
            $t->index('parent_id');
            $t->unique(['base', 'legacy_path'], 'uq_tcpo_cat_base_path');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tcpo_categorias');
    }
};
