<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Anexo (apólice PDF/imagem) do seguro, vinculado ao registro.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('veiculo_seguros') && !Schema::hasColumn('veiculo_seguros', 'arquivo')) {
            Schema::table('veiculo_seguros', function (Blueprint $table) {
                $table->string('arquivo')->nullable()->after('valor');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('veiculo_seguros') && Schema::hasColumn('veiculo_seguros', 'arquivo')) {
            Schema::table('veiculo_seguros', function (Blueprint $table) {
                $table->dropColumn('arquivo');
            });
        }
    }
};
