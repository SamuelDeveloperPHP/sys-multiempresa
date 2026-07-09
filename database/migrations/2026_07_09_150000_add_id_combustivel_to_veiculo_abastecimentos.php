<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vincula o abastecimento a um combustível da lista (fator de CO₂ confiável).
 * A coluna `combustivel` (string) continua como snapshot do nome. Registros
 * antigos ficam com id nulo até o seeder de casamento (best-effort por nome).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculo_abastecimentos', function (Blueprint $t) {
            if (! Schema::hasColumn('veiculo_abastecimentos', 'id_combustivel')) {
                $t->foreignId('id_combustivel')->nullable()->after('combustivel')
                    ->constrained('combustiveis')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('veiculo_abastecimentos', function (Blueprint $t) {
            if (Schema::hasColumn('veiculo_abastecimentos', 'id_combustivel')) {
                $t->dropConstrainedForeignId('id_combustivel');
            }
        });
    }
};
