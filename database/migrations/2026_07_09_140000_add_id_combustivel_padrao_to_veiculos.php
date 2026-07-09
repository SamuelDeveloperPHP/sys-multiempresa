<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Combustível padrão do veículo (ex.: Ambulância = Diesel S10). O analista
 * cadastra uma vez; o abastecimento pré-preenche com esse valor (podendo
 * trocar, p/ veículo flex). Base do cálculo de CO₂. Ver tabela combustiveis.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            if (! Schema::hasColumn('veiculos', 'id_combustivel_padrao')) {
                $t->foreignId('id_combustivel_padrao')->nullable()->after('tipo_tempo')
                    ->constrained('combustiveis')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            if (Schema::hasColumn('veiculos', 'id_combustivel_padrao')) {
                $t->dropConstrainedForeignId('id_combustivel_padrao');
            }
        });
    }
};
