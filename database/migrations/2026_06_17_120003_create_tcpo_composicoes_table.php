<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composições (serviços) do TCPO.
 *
 * CATÁLOGO GLOBAL de referência (sem company_id). Cada composição é um serviço
 * (ex.: "Alvenaria com blocos de concreto 11,5x19x39") com código PINI, código
 * EAP alternativo, unidade, tipo e os totais (snapshot de preço da região/data).
 * O detalhamento (insumos + coeficientes) fica em tcpo_composicao_itens.
 *
 * Idempotência: chave (base, codigo).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('tcpo_composicoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('categoria_id')->nullable()
              ->constrained('tcpo_categorias', 'id', 'fk_tcpo_comp_cat')->nullOnDelete();

            $t->string('base', 32)->default('TCPO');
            $t->string('codigo', 64)->comment('Código PINI, ex: 3R 05 12 00 00 00 00 06 18');
            $t->string('codigo_alt', 64)->nullable()->comment('Código EAP/SINAPI, ex: 06.101.000350.SER');
            $t->string('tipo', 40)->nullable()->comment('SERVIÇO COMPOSTO | SERVIÇO SIMPLES');
            $t->string('unidade', 16)->nullable();
            $t->text('descricao');

            // Snapshot de preço/totais (região/data).
            $t->string('preco_regiao', 64)->nullable();
            $t->string('preco_data', 16)->nullable();
            $t->decimal('total_sem_taxas', 14, 4)->nullable();
            $t->decimal('total_com_taxas', 14, 4)->nullable();
            $t->decimal('total_mod', 14, 4)->nullable()->comment('Total mão de obra');
            $t->decimal('total_mat', 14, 4)->nullable()->comment('Total material');
            $t->decimal('total_eqp', 14, 4)->nullable()->comment('Total equipamento');

            $t->boolean('ativo')->default(true);

            $t->timestamps();
            $t->softDeletes();

            $t->unique(['base', 'codigo'], 'uq_tcpo_comp_base_codigo');
            $t->index('categoria_id');
            $t->index('codigo_alt');
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            \DB::statement('ALTER TABLE tcpo_composicoes ADD FULLTEXT idx_tcpo_comp_ft (descricao)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tcpo_composicoes');
    }
};
