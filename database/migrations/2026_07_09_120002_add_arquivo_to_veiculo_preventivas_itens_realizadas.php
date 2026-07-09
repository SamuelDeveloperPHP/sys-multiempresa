<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Coluna própria para o anexo (NF/comprovante) da OS preventiva.
 *
 * Antes o path do arquivo era concatenado no campo `descricao` (gambiarra do
 * storeOsPreventiva). Agora o anexo tem sua coluna dedicada; `descricao` volta
 * a ser só observações.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculo_preventivas_itens_realizadas', function (Blueprint $t) {
            $t->string('arquivo', 255)->nullable()->after('descricao');
        });
    }

    public function down(): void
    {
        Schema::table('veiculo_preventivas_itens_realizadas', function (Blueprint $t) {
            $t->dropColumn('arquivo');
        });
    }
};
