<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Chave PDM (Padrão de Descrição do Material) para deduplicação de produtos.
 *
 * O catálogo da Leroy retorna o MESMO item (ex.: "Botina Vonder marrom 44")
 * dezenas/centenas de vezes — em categorias diferentes e via paginação Algolia.
 * Como cada ocorrência tem leroy_id próprio, todas viravam linhas distintas.
 *
 * chave_pdm = normalização de (nome + marca): minúsculas, sem acento, só
 * alfanumérico, espaços colapsados. Ex.: "botina vonder marrom 44 vonder".
 * UNIQUE no banco → barreira definitiva contra duplicados, inclusive sob corrida
 * entre os workers paralelos.
 *
 * Idempotente.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('estoque_leroy_produtos')) {
            return;
        }

        if (!Schema::hasColumn('estoque_leroy_produtos', 'chave_pdm')) {
            Schema::table('estoque_leroy_produtos', function (Blueprint $t) {
                $t->string('chave_pdm', 191)->nullable()->after('marca')
                  ->comment('Padrão de Descrição do Material — chave única de deduplicação');
            });
        }

        $idx = collect(Schema::getIndexes('estoque_leroy_produtos'))->pluck('name')->all();
        if (!in_array('uniq_leroy_pdm', $idx, true)) {
            Schema::table('estoque_leroy_produtos', function (Blueprint $t) {
                $t->unique('chave_pdm', 'uniq_leroy_pdm');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('estoque_leroy_produtos')) {
            return;
        }
        $idx = collect(Schema::getIndexes('estoque_leroy_produtos'))->pluck('name')->all();
        if (in_array('uniq_leroy_pdm', $idx, true)) {
            Schema::table('estoque_leroy_produtos', function (Blueprint $t) {
                $t->dropUnique('uniq_leroy_pdm');
            });
        }
        if (Schema::hasColumn('estoque_leroy_produtos', 'chave_pdm')) {
            Schema::table('estoque_leroy_produtos', function (Blueprint $t) {
                $t->dropColumn('chave_pdm');
            });
        }
    }
};
