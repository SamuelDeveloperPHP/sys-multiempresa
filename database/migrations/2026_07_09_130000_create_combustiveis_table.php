<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabela de referência de combustíveis + fatores de emissão de CO₂.
 *
 * Dado de referência NACIONAL (não é por empresa) — segue a lógica do
 * Programa Brasileiro GHG Protocol: separa a fração fóssil da biogênica e
 * considera a mistura obrigatória (ANP). Por litro de combustível de bomba:
 *   CO₂ fóssil/L    = (1 - perc_biogenico) × fator_fossil
 *   CO₂ biogênico/L =      perc_biogenico  × fator_biogenico
 *
 * Fatores/percentuais são editáveis pelo admin (mudam ~anualmente).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('combustiveis', function (Blueprint $t) {
            $t->id();
            $t->string('nome', 60)->unique();
            $t->decimal('fator_fossil', 8, 4)->default(0);     // kg CO₂/L da fração fóssil pura
            $t->decimal('fator_biogenico', 8, 4)->default(0);  // kg CO₂/L da fração biogênica pura
            $t->decimal('perc_biogenico', 6, 4)->default(0);   // fração da mistura 0..1 (ex.: 0,14 = B14)
            $t->boolean('ativo')->default(true);
            $t->unsignedInteger('ordem')->default(0);
            $t->timestamps();
            $t->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combustiveis');
    }
};
