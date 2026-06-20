<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de insumos do TCPO (mão de obra / material / equipamento).
 *
 * CATÁLOGO GLOBAL de referência (sem company_id). Cada insumo tem um código
 * PINI único por base (ex.: "2N 36 16 25 12 29" = Pedreiro). O preço é um
 * snapshot de uma região/data específica (decisão: composição + preço atual).
 *
 * Idempotência: chave (base, codigo).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('tcpo_insumos', function (Blueprint $t) {
            $t->id();
            $t->string('base', 32)->default('TCPO');
            $t->string('codigo', 64)->comment('Código PINI do insumo, ex: 2N 36 16 25 12 29');
            $t->string('descricao', 500);
            $t->string('unidade', 16)->nullable()->comment('h, kg, un, m³...');
            $t->string('classe', 8)->nullable()->comment('MOD = mão de obra | MAT = material | EQP = equipamento');

            // Preço de referência (snapshot região/data).
            $t->decimal('preco_unitario', 14, 4)->default(0);
            $t->string('preco_regiao', 64)->nullable()->comment('ex: São Paulo');
            $t->string('preco_data', 16)->nullable()->comment('ex: 2026/04');

            $t->boolean('ativo')->default(true);

            $t->timestamps();
            $t->softDeletes();

            $t->unique(['base', 'codigo'], 'uq_tcpo_insumo_base_codigo');
            $t->index('classe');
            $t->index('descricao');
        });

        // FULLTEXT para busca por descrição (apenas MySQL/MariaDB).
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            \DB::statement('ALTER TABLE tcpo_insumos ADD FULLTEXT idx_tcpo_insumos_ft (descricao)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tcpo_insumos');
    }
};
