<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parte 2 (EPI) — VARIANTE = combinação concreta (cor × tamanho) de um produto
 * que carrega SALDO próprio. Diferente de estoque_produto_variacoes (que guarda
 * apenas as OPÇÕES disponíveis cadastradas no produto).
 *
 * Criada sob demanda na ENTRADA: ao dar entrada de "Botina Marrom 42", o
 * sistema acha/cria a variante (produto, cor=Marrom, tamanho=42) e a usa como
 * chave de saldo e de lote.
 *
 * Catálogo global → sem company_id (o saldo por empresa fica em estoque_saldos).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_produto_variantes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();
            $t->string('cor', 40)->nullable();
            $t->string('tamanho', 40)->nullable();         // "42" ou "GG"
            $t->string('sku_variante', 120)->nullable();
            $t->string('codigo_barras', 120)->nullable();
            $t->boolean('ativo')->default(true);
            $t->timestamps();
            $t->softDeletes();

            // Uma variante por (produto, cor, tamanho)
            $t->unique(['produto_id', 'cor', 'tamanho'], 'produto_variante_unica');
            $t->index('produto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_produto_variantes');
    }
};
