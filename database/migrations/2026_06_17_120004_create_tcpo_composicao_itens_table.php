<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Itens (detalhamento) de uma composição TCPO.
 *
 * Cada linha liga a composição a um INSUMO (mão de obra / material /
 * equipamento) OU a uma SUB-COMPOSIÇÃO (serviço dentro de serviço), com o
 * coeficiente técnico (consumo por unidade do serviço) e o snapshot de preço.
 *
 * Na reimportação a composição tem seus itens apagados e reinseridos (o
 * detalhamento é substituído por inteiro), então não há chave de upsert aqui.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('tcpo_composicao_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('composicao_id')
              ->constrained('tcpo_composicoes', 'id', 'fk_tcpo_item_comp')->cascadeOnDelete();
            $t->foreignId('insumo_id')->nullable()
              ->constrained('tcpo_insumos', 'id', 'fk_tcpo_item_insumo')->nullOnDelete();
            $t->foreignId('sub_composicao_id')->nullable()
              ->constrained('tcpo_composicoes', 'id', 'fk_tcpo_item_sub')->nullOnDelete();

            // Redundância para rastreio mesmo se o insumo/sub ainda não existir.
            $t->string('codigo', 64)->nullable();
            $t->string('descricao', 500)->nullable();
            $t->string('unidade', 16)->nullable();
            $t->string('classe', 8)->nullable()->comment('MOD | MAT | EQP | SUB');

            $t->decimal('coeficiente', 18, 6)->default(0)->comment('Consumo técnico por unidade do serviço');
            $t->decimal('consumo', 18, 6)->nullable();
            $t->decimal('preco_unitario', 14, 4)->nullable()->comment('Snapshot no momento da importação');
            $t->decimal('total', 14, 4)->nullable()->comment('coeficiente × preço (snapshot)');

            $t->integer('ordem')->default(0);
            $t->timestamps();

            $t->index('composicao_id');
            $t->index('insumo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tcpo_composicao_itens');
    }
};
