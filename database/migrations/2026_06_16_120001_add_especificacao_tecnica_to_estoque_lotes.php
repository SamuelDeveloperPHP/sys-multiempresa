<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Especificação técnica do lote de EPI (texto livre: material, solado,
 * biqueira, normas, etc.). Mostrada no comprovante de entrega.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_lotes', function (Blueprint $t) {
            $t->text('especificacao_tecnica')->nullable()->after('validade');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_lotes', function (Blueprint $t) {
            $t->dropColumn('especificacao_tecnica');
        });
    }
};
