<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotência do sync mobile (offline-first).
 *
 * O cliente PWA gera um client_uuid por criação offline e o reenvia em caso
 * de retry. O servidor deduplica por esse UUID: se já existe registro com o
 * mesmo client_uuid, devolve o existente em vez de criar duplicata.
 *
 * Nullable: registros criados pelo Admin (web) não têm client_uuid.
 * Unique: MySQL permite múltiplos NULLs em índice unique — seguro.
 */
return new class extends Migration {
    private const TABLES = [
        'veiculo_abastecimentos',
        'veiculos_diario_bordo',
        'veiculo_checklist_itens_servicos',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $tableName) {
            if (!Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'client_uuid')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('client_uuid', 64)->nullable()->unique();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'client_uuid')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropUnique(['client_uuid']);
                $table->dropColumn('client_uuid');
            });
        }
    }
};
