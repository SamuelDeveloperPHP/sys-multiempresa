<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * estoque_categorias.legacy_id: bigint -> varchar(64).
 *
 * O ETL antigo (scraping) usava IDs numéricos. A importação da Leroy live usa
 * IDs ObjectId hexadecimais (ex.: 'f48f3f336dd76e7234e119ce') — que estouravam
 * "Incorrect integer value" na coluna bigint. VARCHAR aceita os dois:
 *   - numéricos do legado viram string ('1','2',...) — upsert continua casando
 *     por type-juggling do MySQL.
 *   - hex da Leroy entram direto.
 *
 * Dropa/recria o índice composto (legacy_kind, legacy_id) pra permitir a troca.
 * Idempotente.
 */
return new class extends Migration {
    private string $indexName = 'estoque_categorias_legacy_kind_legacy_id_index';

    public function up(): void
    {
        if (!Schema::hasTable('estoque_categorias')) {
            return;
        }

        $this->dropIndexIfExists();

        Schema::table('estoque_categorias', function (Blueprint $t) {
            $t->string('legacy_id', 64)->nullable()->change();
        });

        $this->addIndexIfMissing();
    }

    public function down(): void
    {
        if (!Schema::hasTable('estoque_categorias')) {
            return;
        }
        // Volta pra bigint só se TODOS os legacy_id forem numéricos (senão quebraria).
        $temHex = \DB::table('estoque_categorias')
            ->whereNotNull('legacy_id')
            ->where('legacy_id', 'REGEXP', '[^0-9]')
            ->exists();

        $this->dropIndexIfExists();
        if (!$temHex) {
            Schema::table('estoque_categorias', function (Blueprint $t) {
                $t->unsignedBigInteger('legacy_id')->nullable()->change();
            });
        }
        $this->addIndexIfMissing();
    }

    private function dropIndexIfExists(): void
    {
        $existe = collect(Schema::getIndexes('estoque_categorias'))->pluck('name')->contains($this->indexName);
        if ($existe) {
            Schema::table('estoque_categorias', fn (Blueprint $t) => $t->dropIndex($this->indexName));
        }
    }

    private function addIndexIfMissing(): void
    {
        $existe = collect(Schema::getIndexes('estoque_categorias'))->pluck('name')->contains($this->indexName);
        if (!$existe) {
            Schema::table('estoque_categorias', fn (Blueprint $t) => $t->index(['legacy_kind', 'legacy_id'], $this->indexName));
        }
    }
};
