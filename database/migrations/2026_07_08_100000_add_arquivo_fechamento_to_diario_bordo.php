<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foto do ENCERRAMENTO do diário de bordo (mobile).
 *
 * O ciclo do diário tem duas evidências fotográficas distintas:
 *   - abertura   → arquivo_app / arquivo_servidor (colunas legadas)
 *   - fechamento → arquivo_fechamento_app / arquivo_fechamento_servidor (novas)
 * Sem as colunas novas, a foto do fechamento sobrescreveria a da abertura.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('veiculos_diario_bordo')) {
            return;
        }
        Schema::table('veiculos_diario_bordo', function (Blueprint $table) {
            if (!Schema::hasColumn('veiculos_diario_bordo', 'arquivo_fechamento_app')) {
                $table->string('arquivo_fechamento_app')->nullable();
            }
            if (!Schema::hasColumn('veiculos_diario_bordo', 'arquivo_fechamento_servidor')) {
                $table->string('arquivo_fechamento_servidor')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('veiculos_diario_bordo')) {
            return;
        }
        Schema::table('veiculos_diario_bordo', function (Blueprint $table) {
            foreach (['arquivo_fechamento_app', 'arquivo_fechamento_servidor'] as $col) {
                if (Schema::hasColumn('veiculos_diario_bordo', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
