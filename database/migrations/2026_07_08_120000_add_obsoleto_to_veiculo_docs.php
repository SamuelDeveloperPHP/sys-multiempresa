<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Controle de documentos OBSOLETOS (fora de uso) — Doc's Técnicos e Legais.
 *
 * Regra (paridade com produção/legado): documentos vencidos ou substituídos
 * são marcados como obsoletos e SAEM da listagem principal, permanecendo
 * acessíveis por um filtro "ver obsoletos". Nada é apagado (auditoria).
 */
return new class extends Migration {
    private const TABLES = ['veiculos_docs_tecnicos', 'veiculos_docs_legais'];

    public function up(): void
    {
        foreach (self::TABLES as $tableName) {
            if (!Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'obsoleto')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->boolean('obsoleto')->default(false)->index()->after('status');
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'obsoleto')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('obsoleto');
            });
        }
    }
};
