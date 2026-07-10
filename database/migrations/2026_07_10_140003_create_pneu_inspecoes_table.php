<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Inspecao do pneu: medicao de sulco (mm) e pressao (psi) numa data, com o
 * veiculo/posicao onde estava. Base dos alertas de sulco critico.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pneu_inspecoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('pneu_id')->constrained('pneus')->cascadeOnDelete();
            $t->foreignId('veiculo_id')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->string('posicao', 12)->nullable();
            $t->date('data');
            $t->decimal('sulco_mm', 5, 2)->nullable();
            $t->decimal('pressao_psi', 6, 2)->nullable();
            $t->integer('medicao')->nullable(); // km/hr do veiculo na inspecao
            $t->text('observacao')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['pneu_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pneu_inspecoes');
    }
};
