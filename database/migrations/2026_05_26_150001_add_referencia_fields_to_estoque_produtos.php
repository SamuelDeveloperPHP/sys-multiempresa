<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campos para produtos importados do catálogo de referência (Leroy Merlin).
 *
 *  - valor_referencia : preço de mercado da Leroy. É SÓ REFERÊNCIA / consulta —
 *                       o front mantém esse campo travado (não editável).
 *  - origem           : 'manual' | 'legado' | 'leroy_merlin' — marca a procedência.
 *  - chave_pdm        : Padrão de Descrição do Material (espelha o do catálogo
 *                       Leroy) — usado pra reimport idempotente / rastreio.
 *  - leroy_id_ref     : id do produto na Leroy (rastreabilidade da origem).
 *
 * Idempotente.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('estoque_produtos')) {
            return;
        }

        Schema::table('estoque_produtos', function (Blueprint $t) {
            if (!Schema::hasColumn('estoque_produtos', 'valor_referencia')) {
                $t->decimal('valor_referencia', 12, 2)->nullable()->after('valor_unitario')
                  ->comment('Preço de referência (ex.: Leroy) — somente consulta, não editável');
            }
            if (!Schema::hasColumn('estoque_produtos', 'origem')) {
                $t->string('origem', 30)->default('manual')->after('ativo')
                  ->comment('manual | legado | leroy_merlin');
            }
            if (!Schema::hasColumn('estoque_produtos', 'chave_pdm')) {
                $t->string('chave_pdm', 191)->nullable()->after('origem');
            }
            if (!Schema::hasColumn('estoque_produtos', 'leroy_id_ref')) {
                $t->string('leroy_id_ref', 64)->nullable()->after('chave_pdm');
            }
        });

        $idx = collect(Schema::getIndexes('estoque_produtos'))->pluck('name')->all();
        Schema::table('estoque_produtos', function (Blueprint $t) use ($idx) {
            if (!in_array('idx_produtos_origem', $idx, true)) {
                $t->index('origem', 'idx_produtos_origem');
            }
            if (!in_array('idx_produtos_chave_pdm', $idx, true)) {
                $t->index('chave_pdm', 'idx_produtos_chave_pdm');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('estoque_produtos')) {
            return;
        }
        $idx = collect(Schema::getIndexes('estoque_produtos'))->pluck('name')->all();
        Schema::table('estoque_produtos', function (Blueprint $t) use ($idx) {
            if (in_array('idx_produtos_origem', $idx, true))    $t->dropIndex('idx_produtos_origem');
            if (in_array('idx_produtos_chave_pdm', $idx, true)) $t->dropIndex('idx_produtos_chave_pdm');
        });
        foreach (['valor_referencia', 'origem', 'chave_pdm', 'leroy_id_ref'] as $col) {
            if (Schema::hasColumn('estoque_produtos', $col)) {
                Schema::table('estoque_produtos', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }
    }
};
