<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pneu = ativo individual rastreado pela carcaca (numero de fogo) ao longo de
 * varias vidas (novo -> recapado 1a -> 2a ...). Circula entre veiculos/posicoes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pneus', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('numero_fogo', 60);        // gravacao unica na carcaca
            $t->string('dot', 20)->nullable();     // codigo DOT (semana/ano fabricacao)
            $t->string('marca', 80)->nullable();
            $t->string('modelo', 80)->nullable();
            $t->string('medida', 40)->nullable();  // ex.: 295/80 R22.5
            $t->string('desenho', 40)->nullable(); // borrachudo, misto, liso, OTR
            $t->string('tipo', 20)->nullable();    // radial / diagonal
            $t->unsignedInteger('vida_atual')->default(0);  // 0=novo, 1=1a recap, ...
            $t->decimal('valor_compra', 12, 2)->nullable();
            $t->date('data_compra')->nullable();
            $t->string('nota_fiscal', 60)->nullable();
            $t->unsignedBigInteger('fornecedor_id')->nullable();
            $t->string('situacao', 20)->default('estoque'); // estoque|montado|recapadora|conserto|sucata
            $t->decimal('sulco_novo_mm', 5, 2)->nullable();  // sulco de fabrica (ref. p/ % desgaste)
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'numero_fogo']);
            $t->index('situacao');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pneus');
    }
};
