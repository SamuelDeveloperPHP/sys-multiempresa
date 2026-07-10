<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — historico de depreciacao do veiculo (importado do legado engeativos2).
 * Cada registro guarda o valor atual do bem numa referencia (mes/ano).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_depreciacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->decimal('valor_atual', 14, 2)->nullable();
            $t->string('referencia_mes', 20)->nullable();
            $t->string('referencia_ano', 10)->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['veiculo_id', 'referencia_ano']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_depreciacoes');
    }
};
