<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Layout de posicoes de pneu do veiculo (chave de config/frota_pneus.layouts).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            if (!Schema::hasColumn('veiculos', 'config_pneus')) {
                $t->string('config_pneus', 40)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('veiculos', function (Blueprint $t) {
            $t->dropColumn('config_pneus');
        });
    }
};
