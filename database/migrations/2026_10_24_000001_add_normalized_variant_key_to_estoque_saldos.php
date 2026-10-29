<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('estoque_saldos') || !Schema::hasColumn('estoque_saldos', 'variante_id')) {
            return;
        }

        $duplicateExists = DB::table('estoque_saldos')
            ->selectRaw('produto_id, obra_id, COALESCE(variante_id, 0) as variante_key')
            ->groupBy('produto_id', 'obra_id', DB::raw('COALESCE(variante_id, 0)'))
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($duplicateExists) {
            throw new RuntimeException(
                'Saldos duplicados encontrados. Execute php artisan estoque:recalcular-saldos com o código atualizado e aplique esta migration novamente.'
            );
        }

        if (!Schema::hasColumn('estoque_saldos', 'variante_key')) {
            Schema::table('estoque_saldos', function (Blueprint $table) {
                $table->unsignedBigInteger('variante_key')->default(0)->after('variante_id');
            });
        }

        DB::table('estoque_saldos')->update([
            'variante_key' => DB::raw('COALESCE(variante_id, 0)'),
        ]);

        $indexes = collect(Schema::getIndexes('estoque_saldos'))->pluck('name');
        if ($indexes->contains('estoque_saldos_produto_obra_variante_unique')) {
            Schema::table('estoque_saldos', function (Blueprint $table) {
                $table->dropUnique('estoque_saldos_produto_obra_variante_unique');
            });
        }

        $indexes = collect(Schema::getIndexes('estoque_saldos'))->pluck('name');
        if (!$indexes->contains('estoque_saldos_produto_obra_variante_key_unique')) {
            Schema::table('estoque_saldos', function (Blueprint $table) {
                $table->unique(
                    ['produto_id', 'obra_id', 'variante_key'],
                    'estoque_saldos_produto_obra_variante_key_unique'
                );
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('estoque_saldos') || !Schema::hasColumn('estoque_saldos', 'variante_key')) {
            return;
        }

        Schema::table('estoque_saldos', function (Blueprint $table) {
            $table->dropUnique('estoque_saldos_produto_obra_variante_key_unique');
            $table->unique(
                ['produto_id', 'obra_id', 'variante_id'],
                'estoque_saldos_produto_obra_variante_unique'
            );
            $table->dropColumn('variante_key');
        });
    }
};
